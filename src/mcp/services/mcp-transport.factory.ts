/**
 * HṚṢĪKEŚA (हृषीकेश) — MCP Transport Factory & Implementations
 *
 * Phase 21: Unified STDIO, HTTP, and In-Memory MCP transport bindings.
 */

import { spawn, ChildProcess } from 'node:child_process';
import readline from 'node:readline';
import { MCPServer } from '../interfaces/mcp.types.js';

export interface JsonRpcRequest<T = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly method: string;
  readonly params?: T;
}

export interface JsonRpcResponse<T = unknown> {
  readonly jsonrpc: '2.0';
  readonly id: string | number;
  readonly result?: T;
  readonly error?: {
    readonly code: number;
    readonly message: string;
    readonly data?: unknown;
  };
}

export interface JsonRpcNotification<T = unknown> {
  readonly jsonrpc: '2.0';
  readonly method: string;
  readonly params?: T;
}

export interface IMcpTransport {
  connect(): Promise<void>;
  send<TReq = unknown, TRes = unknown>(request: JsonRpcRequest<TReq>): Promise<JsonRpcResponse<TRes>>;
  close(): Promise<void>;
  isConnected(): boolean;
  getPid?(): number | undefined;
}

/**
 * In-Memory Transport for deterministic testing and local mock MCP tools.
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

  public async send<TReq = unknown, TRes = unknown>(request: JsonRpcRequest<TReq>): Promise<JsonRpcResponse<TRes>> {
    if (!this.connected) {
      throw new Error('InMemoryMcpTransport is not connected.');
    }
    const res = await this.handler(request as JsonRpcRequest);
    if (res && typeof res === 'object' && ('result' in res || 'error' in res)) {
      return res as JsonRpcResponse<TRes>;
    }
    return {
      jsonrpc: '2.0',
      id: request.id,
      result: res as TRes,
    };
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
  private readonly timeoutMs: number;
  private readonly pendingRequests = new Map<
    string | number,
    {
      resolve: (value: JsonRpcResponse) => void;
      reject: (reason: Error) => void;
    }
  >();

  constructor(command: string, args: readonly string[] = [], env?: Record<string, string>, timeoutMs = 30000) {
    this.command = command;
    this.args = args;
    this.env = env;
    this.timeoutMs = timeoutMs;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.child = spawn(this.command, this.args as string[], {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, ...this.env },
        });

        if (!this.child.stdout || !this.child.stdin) {
          reject(new Error('Failed to attach stdio pipes to MCP child process.'));
          return;
        }

        const rl = readline.createInterface({
          input: this.child.stdout,
          terminal: false,
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

  public async send<TReq = unknown, TRes = unknown>(request: JsonRpcRequest<TReq>): Promise<JsonRpcResponse<TRes>> {
    if (!this.connected || !this.child || !this.child.stdin) {
      throw new Error('StdioMcpTransport is not connected.');
    }

    const stdin = this.child.stdin;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pendingRequests.has(request.id)) {
          this.pendingRequests.delete(request.id);
          reject(new Error(`MCP request timeout for method '${request.method}' (id: ${request.id}) after ${this.timeoutMs}ms`));
        }
      }, this.timeoutMs);

      this.pendingRequests.set(request.id, {
        resolve: (val) => {
          clearTimeout(timeout);
          resolve(val as JsonRpcResponse<TRes>);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
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
    if (this.child && !this.child.killed) {
      try {
        this.child.kill('SIGTERM');
      } catch {
        // Process already terminated
      }
    }
    this.connected = false;
    this.child = null;
    this.pendingRequests.clear();
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public getPid(): number | undefined {
    return this.child?.pid;
  }
}

/**
 * HTTP Transport communicating with an external MCP server via JSON-RPC POST.
 */
export class HttpMcpTransport implements IMcpTransport {
  private connected = false;
  private readonly endpoint: string;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(endpoint: string, headers: Record<string, string> = {}, timeoutMs = 30000) {
    this.endpoint = endpoint;
    this.headers = headers;
    this.timeoutMs = timeoutMs;
  }

  public async connect(): Promise<void> {
    this.connected = true;
  }

  public async send<TReq = unknown, TRes = unknown>(request: JsonRpcRequest<TReq>): Promise<JsonRpcResponse<TRes>> {
    if (!this.connected) {
      throw new Error('HttpMcpTransport is not connected.');
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...this.headers,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`MCP HTTP server returned error: ${res.status} ${res.statusText}`);
      }

      const json = (await res.json()) as JsonRpcResponse<TRes>;
      return json;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`MCP HTTP request timeout for method '${request.method}' after ${this.timeoutMs}ms`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  public async close(): Promise<void> {
    this.connected = false;
  }

  public isConnected(): boolean {
    return this.connected;
  }
}

export class McpTransportFactory {
  public static createInMemoryTransport(handler: (req: any) => Promise<any>): IMcpTransport {
    return new InMemoryMcpTransport(handler);
  }

  public static create(server: MCPServer, inMemoryHandler?: (req: JsonRpcRequest) => Promise<JsonRpcResponse>): IMcpTransport {
    if (server.transport === 'in-memory') {
      if (!inMemoryHandler) {
        throw new Error(`In-memory transport handler must be provided for server '${server.name}'`);
      }
      return new InMemoryMcpTransport(inMemoryHandler);
    }

    if (server.transport === 'http') {
      if (!server.endpoint) {
        throw new Error(`HTTP endpoint required for server '${server.name}'`);
      }
      return new HttpMcpTransport(server.endpoint);
    }

    // Default: stdio
    if (!server.command) {
      throw new Error(`Command required for STDIO MCP server '${server.name}'`);
    }
    return new StdioMcpTransport(server.command, server.args || [], server.envMetadata);
  }
}
