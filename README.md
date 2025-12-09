# AI Intelligent Blind Glasses System 🤖👓

<img width="2481" height="1708" alt="System Overview" src="https://github.com/user-attachments/assets/e8dec4a6-8fa6-4d94-bd66-4e9864b67daf" />
<img width="2480" height="1708" alt="Navigation Interface" src="https://github.com/user-attachments/assets/bc7d1aac-a9e9-4ef8-9d67-224708d0c9fd" />
<img width="2481" height="1708" alt="Object Detection" src="https://github.com/user-attachments/assets/6dd19750-57af-4560-a007-9a7059956b53" />

<div align="center">

An intelligent navigation and assistance system for visually impaired individuals, integrating features such as blind path navigation, crosswalk assistance, object recognition, and real-time voice interaction. This project is for communication and learning purposes only and should not be used directly by visually impaired people.

**Code Repository**: https://github.com/AI-FanGe/OpenAIglasses_for_Navigation.git  
**ModelScope**: https://modelscope.cn/models/archifancy/AIGlasses_for_navigation/summary

</div>

## ✨ Features

### 🚶 Blind Path Navigation System
- **Real-time Blind Path Detection**: Real-time recognition of blind paths based on the YOLO segmentation model
- **Intelligent Voice Guidance**: Provides precise directional guidance (turn left, turn right, go straight, etc.)
- **Obstacle Detection and Avoidance**: Automatically identifies obstacles ahead and plans a route to avoid them
- **Turn Detection**: Automatically recognizes sharp turns and provides early warnings
- **Optical Flow Stabilization**: Uses the Lucas-Kanade optical flow algorithm to stabilize the mask and reduce jitter

### 🚦 Crosswalk Assistance
- **Crosswalk Recognition**: Real-time detection of crosswalk position and direction
- **Traffic Light Recognition**: Traffic light status detection based on color and shape
- **Alignment Guidance**: Guides the user to align with the center of the crosswalk
- **Safety Reminder**: Voice prompt to proceed when the light is green

### 🔍 Object Recognition and Search
- **Intelligent Object Search**: Voice command to find objects (e.g., "Find me a Red Bull")
- **Real-time Target Tracking**: Uses YOLO-E open vocabulary detection + ByteTrack tracking
- **Hand Guidance**: Combines MediaPipe hand detection to guide the user's hand towards the object
- **Grasp Detection**: Detects hand holding actions to confirm the object has been picked up
- **Multimodal Feedback**: Visual annotations + voice guidance + centering prompts

### 🎙️ Real-time Voice Interaction
- **Speech Recognition (ASR)**: Real-time speech recognition based on Alibaba Cloud DashScope Paraformer
- **Multimodal Dialogue**: Qwen-Omni-Turbo supports image + text input, voice output
- **Intelligent Command Parsing**: Automatically identifies different types of commands (navigation, search, dialogue, etc.)
- **Context Awareness**: Smartly filters out irrelevant commands in different modes

### 📹 Video and Audio Processing
- **Real-time Video Streaming**: WebSocket streaming, supports multiple clients watching simultaneously
- **Synchronized Video and Audio Recording**: Automatically saves timestamped video and audio files
- **IMU Data Fusion**: Receives IMU data from ESP32, supports pose estimation
- **Multi-channel Audio Mixing**: Supports simultaneous playback of system voice, AI response, and ambient sound

### 🎨 Visualization and Interaction
- **Web Real-time Monitoring**: Real-time viewing of processed video stream in the browser
- **IMU 3D Visualization**: Real-time rendering of device pose using Three.js
- **Status Panel**: Displays navigation status, detection information, FPS, etc.
- **Chinese Friendly**: All interfaces and voices use Chinese, supports custom fonts

## 💻 System Requirements

### Hardware Requirements
- **Development/Server Side**:
  - CPU: Intel i5 or above (i7/i9 recommended)
  - GPU: NVIDIA GPU (CUDA 11.8+ supported, RTX 3060 or above recommended)
  - Memory: 8GB RAM (16GB recommended)
  - Storage: 10GB available space

- **Client Device** (optional):
  - ESP32-CAM or other WebSocket-supported camera
  - Microphone (for voice input)
  - Speaker/Headphones (for voice output)

### Software Requirements
- **Operating System**: Windows 10/11, Linux (Ubuntu 20.04+), macOS 10.15+
- **Python**: 3.9 - 3.11
- **CUDA**: 11.8 or higher (GPU acceleration required)
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+ (for Web monitoring)

### API Keys
- **Alibaba Cloud DashScope API Key** (required):
  - For speech recognition (ASR) and Qwen-Omni dialogue
  - Application address: https://dashscope.console.aliyun.com/

## 🚀 Quick Start

### 1. Clone the Project

```bash
git clone https://github.com/AI-FanGe/OpenAIglasses_for_Navigation.git
cd OpenAIglasses_for_Navigation/rebuild1002
```

### 2. Install Dependencies

#### Create a Virtual Environment (recommended)

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/macOS
source venv/bin/activate
```

#### Install Python Packages

```bash
pip install -r requirements.txt
```

#### Install CUDA and cuDNN (for GPU acceleration)

Please refer to the [NVIDIA CUDA Toolkit Installation Guide](https://developer.nvidia.com/cuda-downloads)

### 3. Download Model Files

#### Option 1: Download from ModelScope (Recommended)

We recommend using the ModelScope SDK to download models. First install ModelScope:

```bash
pip install modelscope
```

**Command Line Download:**

Download the full model repository:
```bash
modelscope download --model archifancy/AIGlasses_for_navigation
```

Download a single file to a specified local folder:
```bash
modelscope download --model archifancy/AIGlasses_for_navigation README.md --local_dir ./dir
```

**SDK Download:**

```python
from modelscope import snapshot_download
model_dir = snapshot_download('archifancy/AIGlasses_for_navigation')
```

**Git Download:**

Ensure Git LFS is installed:
```bash
git lfs install
git clone https://www.modelscope.cn/archifancy/AIGlasses_for_navigation.git
```

#### Option 2: Manual Download

Place the following model files in the `model/` directory:

| Model File | Purpose | Size | Download Link |
|------------|---------|------|---------------|
| `yolo-seg.pt` | Blind path segmentation | ~50MB | [ModelScope](https://modelscope.cn/models/archifancy/AIGlasses_for_navigation) |
| `yoloe-11l-seg.pt` | Open vocabulary detection | ~80MB | [ModelScope](https://modelscope.cn/models/archifancy/AIGlasses_for_navigation) |
| `shoppingbest5.pt` | Object recognition | ~30MB | [ModelScope](https://modelscope.cn/models/archifancy/AIGlasses_for_navigation) |
| `trafficlight.pt` | Traffic light detection | ~20MB | [ModelScope](https://modelscope.cn/models/archifancy/AIGlasses_for_navigation) |
| `hand_landmarker.task` | Hand detection | ~15MB | [MediaPipe Models](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker#models) |

### 4. Configure API Keys

Create a `.env` file:

```bash
# .env
DASHSCOPE_API_KEY=your_api_key_here
```

Or modify directly in the code (not recommended):
```python
# app_main.py, line 50
API_KEY = "your_api_key_here"
```

### 5. Start the System

```bash
python app_main.py
```

The system will start at `http://0.0.0.0:8081`. Open your browser to see the real-time monitoring interface.

### 6. Connect Devices (optional)

If using ESP32-CAM, please:
1. Flash `compile/compile.ino` to the ESP32
2. Modify WiFi configuration to connect to the same network
3. The ESP32 will automatically connect to the WebSocket endpoint

## 🏗️ System Architecture

### Overall Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  ESP32-CAM   │  │   Browser    │  │  Mobile App  │      │
│  │ (Video/Audio)│  │(Monitoring UI)│  │(Voice Control)│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼─────────────┘
          │ WebSocket        │ HTTP/WS          │ WebSocket
┌─────────┼──────────────────┼──────────────────┼─────────────┐
│         │                  │                  │              │
│    ┌────▼──────────────────▼──────────────────▼────────┐    │
│    │      FastAPI Main Service (app_main.py)          │    │
│    │  - WebSocket Route Management                     │    │
│    │  - Audio/Video Stream Distribution                │    │
│    │  - State Management & Coordination                │    │
│    └────┬────────────────┬────────────────┬─────────────┘    │
│         │                │                │                  │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐         │
│  │ ASR Module   │  │ Omni Dialog │  │ Audio Play  │         │
│  │ (asr_core)   │  │(omni_client)│  │(audio_player)│         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                               │
│         Application Layer                                     │
└───────────────────────────────────────────────────────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────┐
│                  Navigation Control Layer                    │
│    ┌─────────────────────────────────────────────────┐       │
│    │  NavigationMaster (navigation_master.py)         │       │
│    │  - State Machine: IDLE/CHAT/BLINDPATH_NAV/      │       │
│    │            CROSSING/TRAFFIC_LIGHT/ITEM_SEARCH    │       │
│    │  - Mode Switching & Coordination                 │       │
│    └───┬─────────────────────┬───────────────────┬───┘       │
│        │                     │                   │            │
│   ┌────▼────────┐   ┌────────▼────────┐   ┌─────▼──────┐   │
│   │Blind Path   │   │Crosswalk Nav    │   │Item Search │   │
│   │Navigation   │   │(crossstreet)    │   │(yolomedia)  │   │
│   │(blindpath)  │   │                 │   │            │   │
│   └──────────────┘   └──────────────────┘   └─────────────┘   │
└───────────────────────────────────────────────────────────────┘
          │                  │                  │
┌─────────▼──────────────────▼──────────────────▼──────────────┐
│                     Model Inference Layer                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ YOLO Segment │  │ YOLO-E Detect│  │ MediaPipe    │       │
│  │(Blind/Cross) │  │(Open Vocab)  │  │(Hand Detect) │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │Traffic Light │  │Optical Flow  │                         │
│  │Detect(HSV+Y) │  │(Lucas-Kanade)│                         │
│  └──────────────┘  └──────────────┘                         │
└───────────────────────────────────────────────────────────────┘
          │
┌─────────▼─────────────────────────────────────────────────────┐
│                    External Service Layer                     │
│  ┌──────────────────────────────────────────────┐            │
│  │  Alibaba Cloud DashScope API                 │            │
│  │  - Paraformer ASR (Real-time Speech Recog)   │            │
│  │  - Qwen-Omni-Turbo (Multimodal Dialog)       │            │
│  │  - Qwen-Turbo (Label Extraction)             │            │
│  └──────────────────────────────────────────────┘            │
└───────────────────────────────────────────────────────────────┘
```

### Core Module Description

| Module | File | Function |
|--------|------|----------|
| **Main Application** | `app_main.py` | FastAPI service, WebSocket management, state coordination |
| **Navigation Master** | `navigation_master.py` | State machine management, mode switching, voice throttling |
| **Blind Path Navigation** | `workflow_blindpath.py` | Blind path detection, obstacle avoidance, turning guidance |
| **Crosswalk Navigation** | `workflow_crossstreet.py` | Crosswalk detection, traffic light recognition, alignment guidance |
| **Object Search** | `yolomedia.py` | Object detection, hand guidance, grasp confirmation |
| **Speech Recognition** | `asr_core.py` | Real-time ASR, VAD, command parsing |
| **Speech Synthesis** | `omni_client.py` | Qwen-Omni streaming voice generation |
| **Audio Playback** | `audio_player.py` | Multi-channel mixing, TTS playback, volume control |
| **Video Recording** | `sync_recorder.py` | Synchronized video and audio recording |
| **Bridge IO** | `bridge_io.py` | Thread-safe frame buffering and distribution |

## 📖 Usage Instructions

### Voice Commands

The system supports the following voice commands (no wake word needed):

#### Navigation Control
```
"开始导航" / "盲道导航"     → Start blind path navigation
"停止导航" / "结束导航"     → Stop navigation
"开始过马路" / "帮我过马路"  → Start crosswalk mode
"过马路结束" / "结束过马路"  → Stop crosswalk mode
```

#### Traffic Light Detection
```
"检测红绿灯" / "看红绿灯"   → Start traffic light detection
"停止检测" / "停止红绿灯"   → Stop detection
```

#### Object Search
```
"帮我找一下 [物品名]"       → Start object search
  Examples:
  - "帮我找一下红牛" (Find me Red Bull)
  - "找一下AD钙奶" (Find AD Calcium Milk)
  - "帮我找矿泉水" (Find mineral water)
"找到了" / "拿到了"         → Confirm object found
```

#### Intelligent Dialogue
```
"帮我看看这是什么"          → Take photo for recognition
"这个东西能吃吗"            → Item inquiry
Any other questions         → AI dialogue
```

### Navigation State Explanation

The system includes the following main states (automatically switched):

1. **IDLE** - Idle state
   - Waiting for user commands
   - Displaying raw video stream

2. **CHAT** - Chat mode
   - Multimodal dialogue with AI
   - Pauses navigation functions

3. **BLINDPATH_NAV** - Blind path navigation
   - **ONBOARDING**: Onboarding to the blind path
     - ROTATION: Aligning with the blind path
     - TRANSLATION: Moving to the center of the blind path
   - **NAVIGATING**: Walking along the blind path
     - Real-time direction correction
     - Obstacle detection
   - **MANEUVERING_TURN**: Turning
   - **AVOIDING_OBSTACLE**: Avoiding obstacles

4. **CROSSING** - Crossing mode
   - **SEEKING_CROSSWALK**: Finding the crosswalk
   - **WAIT_TRAFFIC_LIGHT**: Waiting for the green light
   - **CROSSING**: Crossing the road
   - **SEEKING_NEXT_BLINDPATH**: Finding the opposite blind path

5. **ITEM_SEARCH** - Object search
   - Real-time detection of target objects
   - Guiding the hand towards the object
   - Confirming the grasp

6. **TRAFFIC_LIGHT_DETECTION** - Traffic light detection
   - Real-time detection of traffic light status
   - Voice announcement of color changes

### Web Monitoring Interface

Open your browser and visit `http://localhost:8081` to see:

- **Real-time Video Stream**: Displays the processed video with navigation annotations
- **Status Panel**: Current mode, detection information, FPS
- **IMU Visualization**: 3D real-time rendering of device pose
- **Speech Recognition Results**: Display recognized text and AI responses

### WebSocket Endpoints

| Endpoint | Purpose | Data Format |
|----------|---------|-------------|
| `/ws/camera` | ESP32 camera streaming | Binary (JPEG) |
| `/ws/viewer` | Browser subscription to video | Binary (JPEG) |
| `/ws_audio` | ESP32 audio upload | Binary (PCM16) |
| `/ws_ui` | UI status push | JSON |
| `/ws` | IMU data reception | JSON |
| `/stream.wav` | Audio download stream | Binary (WAV) |

## ⚙️ Configuration Instructions

### Environment Variables

Create a `.env` file to configure the following parameters:

```bash
# Alibaba Cloud API
DASHSCOPE_API_KEY=sk-xxxxx

# Model paths (optional, use default paths if not configured)
BLIND_PATH_MODEL=model/yolo-seg.pt
OBSTACLE_MODEL=model/yoloe-11l-seg.pt
YOLOE_MODEL_PATH=model/yoloe-11l-seg.pt

# Navigation parameters
AIGLASS_MASK_MIN_AREA=1500      # Minimum mask area
AIGLASS_MASK_MORPH=3            # Morphological kernel size
AIGLASS_MASK_MISS_TTL=6         # Mask missing tolerance frames
AIGLASS_PANEL_SCALE=0.65        # Data panel scale

# Audio configuration
TTS_INTERVAL_SEC=1.0            # Voice broadcast interval
ENABLE_TTS=true                 # Enable voice broadcast
```

### Modify Model Paths

If the model files are not in the default location, you can modify them in the relevant files:

```python
# workflow_blindpath.py
seg_model_path = "your/custom/path/yolo-seg.pt"

# yolomedia.py
YOLO_MODEL_PATH = "your/custom/path/shoppingbest5.pt"
HAND_TASK_PATH = "your/custom/path/hand_landmarker.task"
```

### Adjust Performance Parameters

Adjust according to hardware performance:

```python
# yolomedia.py
HAND_DOWNSCALE = 0.8    # Hand detection downsampling (smaller = faster, lower accuracy)
HAND_FPS_DIV = 1        # Hand detection frame skipping (2=every other frame, 3=every 3 frames)

# workflow_blindpath.py  
FEATURE_PARAMS = dict(
    maxCorners=600,      # Optical flow feature points (fewer = faster)
    qualityLevel=0.001,  # Feature point quality
    minDistance=5        # Minimum feature point spacing
)
```

## 🛠️ Development Documentation

### Adding New Voice Commands

Add to the `start_ai_with_text_custom()` function in `app_main.py`:

```python
# Check new command
if "new_command_keyword" in user_text:
    # Execute custom logic
    print("[CUSTOM] New command triggered")
    await ui_broadcast_final("[System] New feature activated")
    return
```

If you need to modify the command filtering rules:

```python
# Modify allowed_keywords list
allowed_keywords = ["help me see", "help me find", "your_new_keyword"]
```

### Expanding Navigation Features

Add a new state in `workflow_blindpath.py`:

```python
# Initialize in BlindPathNavigator.__init__()
self.your_new_state_var = False

# Process in process_frame()
def process_frame(self, image):
    if self.your_new_state_var:
        # Custom processing logic
        guidance_text = "New state guidance"
    # ...
```

Add state machine states in `navigation_master.py`:

```python
class NavigationMaster:
    def start_your_new_mode(self):
        self.state = "YOUR_NEW_MODE"
        # Initialization logic
```

### Integrating a New Model

Create a model wrapper class:

```python
# your_model_wrapper.py
class YourModelWrapper:
    def __init__(self, model_path):
        self.model = load_your_model(model_path)
    
    def detect(self, image):
        # Inference logic
        return results
```

Load it in `app_main.py`:

```python
your_model = YourModelWrapper("model/your_model.pt")
```

Call it from the corresponding workflow:

```python
results = your_model.detect(image)
```

### Debugging Tips

1. **Enable Detailed Logging**:

```python
# At the top of app_main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

2. **Identify Frame Rate Bottlenecks**:

```python
# yolomedia.py
PERF_DEBUG = True  # Print processing time
```

3. **Test Individual Modules**:

```bash
# Test blind path navigation
python test_cross_street_blindpath.py

# Test traffic light detection
python test_traffic_light.py

# Test recording function
python test_recorder.py
```

## 📦 Model Download

### ModelScope Download

The models are hosted on ModelScope. For detailed download instructions, please refer to [MODEL_DOWNLOAD.md](docs/MODEL_DOWNLOAD.md).

Quick download:
```bash
pip install modelscope
modelscope download --model archifancy/AIGlasses_for_navigation
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- YOLO models from Ultralytics
- MediaPipe for hand detection
- Alibaba Cloud DashScope for ASR and multimodal AI services
- ModelScope for model hosting

## 📧 Contact

For questions or suggestions, please open an issue on GitHub.

---

<div align="center">
Made with ❤️ for accessibility and innovation
</div>

