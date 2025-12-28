# Visual Workflow Builder

I've added a powerful **Visual Workflow Builder** to MCP Chat Studio. This transforms the tool from a simple tester into a sophisticated automation platform.

## New Features

### ⛓️ Visual Workflow Studio
- **Drag-and-Drop Interface:** Create complex tool chains visually.
- **Node Types:**
  - **Start Trigger:** Initiates the flow.
  - **MCP Tool Node:** Select any connected server and tool.
  - **LLM Node:** Process data with AI (e.g., "Summarize the output of the previous tool").
  - **JavaScript Node:** Run custom logic/glue code.
- **Variable Substitution:** Use `{{nodeId.output}}` to pipe data between nodes.
- **Execution Engine:** Run workflows and see real-time logs of each step.
- **Save & Load:** Persist your best workflows for reuse.

### 🛠️ Technical Changes
- **Backend:** Added `WorkflowEngine.js` service and `/api/workflows` endpoints.
- **Frontend:** Added a new "Workflows" tab with a custom-built, lightweight canvas editor (no heavy external dependencies).

## How to Use
1. Start the app (`npm run dev`).
2. Click the new **⛓️ Workflows** tab in the sidebar.
3. Click **+ New Workflow**.
4. Add nodes (e.g., Tool -> LLM).
5. Connect them by dragging from "Out" (right) to "In" (left) ports.
6. Click **▶️ Run** to execute the chain.

This allows you to build things like:
> *Fetch GitHub Issue* -> *Read File Content* -> *LLM: "Analyze if the file fixes the issue"* -> *Output Result*

Enjoy your new superpower! 🚀