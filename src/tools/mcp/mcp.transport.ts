/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Transport Implementations
 */

import { spawn, ChildProcess } from 'node:child_process';
import readline from 'node:readline';
import { JsonRpcRequest, JsonRpcResponse, JsonRpcNotification } from './mcp.types.js';

export interface IMcpTransport {
  connect(): Promise<void>;
  send<TReq = unknown, TRes = unknown>(
    request: JsonRpcRequest<TReq>
  ): Promise<JsonRpcResponse<TRes>>;
  close(): Promise<void>;
  isConnected(): boolean;
  onNotification?(callback: (notification: JsonRpcNotification) => void): void;
}

/**
 * In-Memory Transport for deterministic testing and local in-process MCP tools.
 */
export class InMemoryMcpTransport implements IMcpTransport {
  private connected = false;
  private readonly handler: (req: JsonRpcRequest) => Promise<JsonRpcResponse>;

  constructor(handler: (req: JsonRpcRequest) => Promise<JsonRpcResponse>) {
    this.handler = handler;
  }

  public async connect(): Promise<void> {
    this.connected = true;
  }

  public async send<TReq = unknown, TRes = unknown>(
    request: JsonRpcRequest<TReq>
  ): Promise<JsonRpcResponse<TRes>> {
    if (!this.connected) {
      throw new Error('InMemoryMcpTransport is not connected.');
    }
    const response = await this.handler(request as JsonRpcRequest);
    return response as JsonRpcResponse<TRes>;
  }

  public async close(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }
}

/**
 * Stdio Transport launching a subprocess and communicating via line-delimited JSON-RPC.
 */
export class StdioMcpTransport implements IMcpTransport {
  private child: ChildProcess | null = null;
  private connected = false;
  private readonly command: string;
  private readonly args: readonly string[];
  private readonly env?: Record<string, string>;
  private readonly pendingRequests = new Map<
    string | number,
    {
      resolve: (value: JsonRpcResponse) => void;
      reject: (reason: Error) => void;
    }
  >();

  constructor(command: string, args: readonly string[] = [], env?: Record<string, string>) {
    this.command = command;
    this.args = args;
    this.env = env;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.child = spawn(this.command, this.args as string[], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...this.env }
        });

        if (!this.child.stdout || !this.child.stdin) {
          reject(new Error('Failed to attach stdio pipes to child process.'));
          return;
        }

        const rl = readline.createInterface({
          input: this.child.stdout,
          terminal: false
        });

        rl.on('line', (line) => {
          const trimmed = line.trim();
          if (!trimmed) return;
          try {
            const parsed = JSON.parse(trimmed) as JsonRpcResponse;
            if (parsed.id !== undefined && this.pendingRequests.has(parsed.id)) {
              const pending = this.pendingRequests.get(parsed.id)!;
              this.pendingRequests.delete(parsed.id);
              pending.resolve(parsed);
            }
          } catch {
            // Ignore non-JSON stdout lines from server
          }
        });

        this.child.on('error', (err) => {
          this.connected = false;
          reject(err);
        });

        this.child.on('exit', () => {
          this.connected = false;
          for (const [, pending] of this.pendingRequests) {
            pending.reject(new Error('MCP server process exited unexpectedly.'));
          }
          this.pendingRequests.clear();
        });

        this.connected = true;
        resolve();
      } catch (err) {
        this.connected = false;
        reject(err);
      }
    });
  }

  public async send<TReq = unknown, TRes = unknown>(
    request: JsonRpcRequest<TReq>
  ): Promise<JsonRpcResponse<TRes>> {
    if (!this.connected || !this.child || !this.child.stdin) {
      throw new Error('StdioMcpTransport is not connected.');
    }

    const stdin = this.child.stdin;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`MCP request timeout for method '${request.method}' (id: ${request.id})`));
        }
      }, 15000);

      this.pendingRequests.set(request.id, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val as JsonRpcResponse<TRes>);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        }
      });

      const payload = JSON.stringify(request) + '\n';
      stdin.write(payload, 'utf-8', (err) => {
        if (err) {
          clearTimeout(timeout);
          this.pendingRequests.delete(request.id);
          reject(err);
        }
      });
    });
  }

  public async close(): Promise<void> {
    this.connected = false;
    if (this.child) {
      this.child.kill();
      this.child = null;
    }
    for (const [, pending] of this.pendingRequests) {
      pending.reject(new Error('MCP transport closed.'));
    }
    this.pendingRequests.clear();
  }

  public isConnected(): boolean {
    return this.connected;
  }
}
