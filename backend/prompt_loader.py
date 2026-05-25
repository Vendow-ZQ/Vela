import os
from pathlib import Path


PROMPTS_DIR = Path(__file__).parent / "prompts"


def load_prompt(name: str, **variables) -> str:
    """Load a prompt markdown file and inject variables.

    Args:
        name: Prompt file name without .md extension
        **variables: Key-value pairs to replace {{key}} in the template

    Returns:
        The prompt string with variables injected
    """
    prompt_path = PROMPTS_DIR / f"{name}.md"
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")

    content = prompt_path.read_text(encoding="utf-8")

    # Inject variables
    for key, value in variables.items():
        placeholder = f"{{{{{key}}}}}"
        content = content.replace(placeholder, str(value))

    return content


def list_prompts() -> list[str]:
    """List all available prompt files."""
    if not PROMPTS_DIR.exists():
        return []
    return [f.stem for f in PROMPTS_DIR.glob("*.md")]
