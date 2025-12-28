# ⛓️ Visual Workflow Builder Guide

The Workflow Builder allows you to chain MCP tools, AI models, and custom logic to create powerful automation sequences.

## 🚀 Getting Started

1. Navigate to the **Workflows** tab.
2. Click **+ New Workflow**.
3. You will start with a **TRIGGER** node.

## 📦 Node Types

### 1. 🟢 TRIGGER
- The starting point of every workflow.
- Passes the initial input (JSON) to connected nodes.
- **Output:** The input object (e.g., `{ "timestamp": 12345 }`).

### 2. 🔵 MCP TOOL
- Executes a tool from any connected MCP server.
- **Setup:**
  1. Select the **Server**.
  2. Select the **Tool**.
  3. (Optional) The tool's arguments will be populated from the previous node's output if standard naming matches, or you can use the JS Node to format them.
- **Output:** The JSON result from the tool.

### 3. 🟠 LLM (AI)
- Sends a prompt to the configured LLM.
- **Setup:**
  - Write a prompt in the text area.
  - Use variables like `{{tool_123.output}}` to insert data from previous steps.
- **Example Prompt:**
  ```text
  Summarize this issue: {{github_tool_1.output}}
  ```
- **Output:** The AI's text response.

### 4. 🟣 JAVASCRIPT
- Runs custom JavaScript code.
- Useful for formatting data between tools.
- **Context:**
  - `input`: The workflow's initial input.
  - `context`: Object containing outputs of all previous nodes (e.g., `context.steps.node_id`).
- **Example:**
  ```javascript
  // Extract just the file names
  const files = context.steps.ls_tool.output.files;
  return files.map(f => f.name);
  ```

## 🔗 Connecting Nodes
- Drag from the **Right Dot (Output)** of one node to the **Left Dot (Input)** of another.
- Ensure the flow makes logical sense (A -> B -> C).

## ▶️ Execution
1. Click **Run** in the toolbar.
2. The **Execution Log** will open at the bottom.
3. Green bars indicate success; Red indicates failure.
4. Expand log entries to see exact inputs and outputs.

## 💾 Saving
- Click **Save** to persist your workflow to `workflows.json`.
- Workflows are saved locally on your machine.
