# Contributing to AI Intelligent Blind Glasses System

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Respect different viewpoints and experiences

## How to Contribute

### Reporting Bugs

If you find a bug, please create an issue with:
- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- System information (OS, Python version, etc.)
- Relevant log outputs

### Suggesting Enhancements

For feature requests:
- Describe the enhancement clearly
- Explain the use case and benefits
- Provide examples if possible

### Pull Requests

1. **Fork the Repository**
   ```bash
   git clone https://github.com/AI-FanGe/OpenAIglasses_for_Navigation.git
   cd OpenAIglasses_for_Navigation
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Write clear, documented code
   - Follow existing code style
   - Add tests if applicable
   - Update documentation as needed

4. **Test Your Changes**
   ```bash
   python -m pytest tests/
   # Or run specific test files
   ```

5. **Commit Changes**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
   Use clear, descriptive commit messages.

6. **Push and Create Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a PR on GitHub with a clear description.

## Development Setup

### Prerequisites

- Python 3.9-3.11
- CUDA 11.8+ (for GPU acceleration)
- Git and Git LFS

### Setup Steps

1. Clone and navigate to project:
   ```bash
   git clone https://github.com/AI-FanGe/OpenAIglasses_for_Navigation.git
   cd OpenAIglasses_for_Navigation/rebuild1002
   ```

2. Create virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Linux/macOS
   # or
   venv\Scripts\activate  # Windows
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # Development dependencies
   ```

4. Download models (see [MODEL_DOWNLOAD.md](MODEL_DOWNLOAD.md))

5. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

## Coding Standards

### Python Style

- Follow PEP 8 style guide
- Use type hints where appropriate
- Maximum line length: 100 characters
- Use meaningful variable and function names

### Code Organization

- Keep functions focused and single-purpose
- Add docstrings to classes and functions
- Group related functionality in modules

### Example

```python
def detect_blind_path(image: np.ndarray, model: YOLO) -> Tuple[np.ndarray, float]:
    """
    Detect blind path in the given image.
    
    Args:
        image: Input image as numpy array
        model: YOLO segmentation model
        
    Returns:
        Tuple of (mask, confidence_score)
    """
    results = model(image)
    # ... processing logic
    return mask, confidence
```

## Testing

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_blindpath.py

# Run with coverage
pytest --cov=. tests/
```

### Writing Tests

- Write tests for new features
- Aim for >80% code coverage
- Use descriptive test names
- Test edge cases and error conditions

## Documentation

### Code Documentation

- Add docstrings to all public functions/classes
- Include parameter descriptions and return types
- Provide usage examples for complex functions

### README Updates

- Update README.md for user-facing changes
- Add examples for new features
- Update installation instructions if dependencies change

## Project Structure

```
rebuild1002/
├── app_main.py              # Main application entry
├── navigation_master.py     # State machine management
├── workflow_blindpath.py    # Blind path navigation
├── workflow_crossstreet.py  # Crosswalk navigation
├── yolomedia.py            # Object detection
├── asr_core.py             # Speech recognition
├── omni_client.py          # Multimodal AI client
├── audio_player.py         # Audio playback
├── sync_recorder.py        # Video recording
├── bridge_io.py            # Frame buffering
├── model/                  # Model files
├── docs/                   # Documentation
└── tests/                  # Test files
```

## Review Process

1. All PRs require at least one maintainer review
2. CI checks must pass
3. Code style must be consistent
4. Documentation must be updated
5. Tests must pass and coverage maintained

## Questions?

- Open an issue for questions
- Check existing issues and discussions
- Contact maintainers for urgent matters

Thank you for contributing! 🎉

