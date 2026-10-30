# AGENT_LOOP v1.0.0

A template for self-looping and prompt improvement for data collection workflows.

## Template

> Learn; refine prompts; repeat approved runs; stop on failure.

## Usage

- **Scope:** Only the quoted single line above is the prompt.
- **Budget:** Verify the exact token count with your target model's tokenizer before execution (under 16 tokens across standard tokenizers).
- **Bounds:** Apply strictly to authorized workflows with an explicit finite loop limit and budget.
- **Termination:** Halt immediately on error or when reaching the maximum iteration count.
