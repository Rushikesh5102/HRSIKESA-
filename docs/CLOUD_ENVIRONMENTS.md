# Cloud Environments Integration (AWS / GCP / Azure / OCI)

## Read-Only Discovery vs Mutating Operations
HṚṢĪKEŚA establishes a strict division between read-only infrastructure exploration and modifying cloud actions.

### 1. Read-Only Discovery
- `cloud.discovery` capability allows enumeration of compute instances, serverless functions, storage buckets, VPCs, and IAM role summaries.
- Discovery never alters state or triggers charges.

### 2. Mutating Operations
- Cloud mutations (`terminate-instances`, `delete-bucket`, `create-stack`, `update-policy`) are classified as **Tier 4 (Critical)**.
- Mutating commands require explicit sovereign confirmation before submission to the cloud provider SDK.
