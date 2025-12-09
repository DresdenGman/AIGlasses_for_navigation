# System Architecture Documentation

This document provides a detailed overview of the AI Intelligent Blind Glasses System architecture.

## Overview

The system is designed as a modular, real-time navigation assistance platform for visually impaired individuals. It combines computer vision, speech recognition, and multimodal AI to provide comprehensive navigation support.

## Architecture Layers

### 1. Client Layer

**Components:**
- ESP32-CAM: Video and audio streaming
- Web Browser: Real-time monitoring interface
- Mobile App: Voice control interface

**Communication:**
- WebSocket protocol for real-time data streaming
- HTTP/HTTPS for web interface

### 2. Application Layer

**Main Service (`app_main.py`):**
- FastAPI-based web server
- WebSocket route management
- State coordination
- Client connection management

**Key Modules:**
- `asr_core.py`: Speech recognition using DashScope Paraformer
- `omni_client.py`: Multimodal dialogue with Qwen-Omni-Turbo
- `audio_player.py`: Multi-channel audio mixing and playback
- `bridge_io.py`: Thread-safe frame buffering

### 3. Navigation Control Layer

**Navigation Master (`navigation_master.py`):**
- State machine implementation
- Mode switching logic
- Voice command throttling
- Context management

**State Machine States:**
- `IDLE`: Waiting for commands
- `CHAT`: AI dialogue mode
- `BLINDPATH_NAV`: Blind path navigation
- `CROSSING`: Crosswalk navigation
- `TRAFFIC_LIGHT_DETECTION`: Traffic light monitoring
- `ITEM_SEARCH`: Object search mode

### 4. Navigation Workflows

**Blind Path Navigation (`workflow_blindpath.py`):**
- Real-time blind path segmentation
- Optical flow stabilization (Lucas-Kanade)
- Obstacle detection and avoidance
- Turn detection and guidance
- Sub-states:
  - `ONBOARDING`: Initial alignment
  - `NAVIGATING`: Following the path
  - `MANEUVERING_TURN`: Handling turns
  - `AVOIDING_OBSTACLE`: Obstacle avoidance

**Crosswalk Navigation (`workflow_crossstreet.py`):**
- Crosswalk detection and alignment
- Traffic light recognition (HSV + YOLO)
- Safety guidance
- Sub-states:
  - `SEEKING_CROSSWALK`: Finding crosswalk
  - `WAIT_TRAFFIC_LIGHT`: Waiting for green light
  - `CROSSING`: Crossing the road
  - `SEEKING_NEXT_BLINDPATH`: Finding destination path

**Object Search (`yolomedia.py`):**
- Open vocabulary object detection (YOLO-E)
- Target tracking (ByteTrack)
- Hand detection and guidance (MediaPipe)
- Grasp confirmation
- Real-time visual feedback

### 5. Model Inference Layer

**Computer Vision Models:**
- YOLO Segmentation: Blind path and crosswalk detection
- YOLO-E: Open vocabulary object detection
- Custom YOLO: Traffic light detection
- MediaPipe: Hand landmark detection

**Processing Pipeline:**
1. Frame capture from camera
2. Preprocessing (resize, normalization)
3. Model inference (GPU-accelerated)
4. Post-processing (NMS, filtering)
5. Result aggregation

### 6. External Services Layer

**Alibaba Cloud DashScope:**
- Paraformer ASR: Real-time speech recognition
- Qwen-Omni-Turbo: Multimodal dialogue
- Qwen-Turbo: Text processing and label extraction

## Data Flow

### Video Processing Flow

```
ESP32-CAM → WebSocket → app_main.py → bridge_io.py
                                              ↓
                                    Navigation Master
                                              ↓
                        ┌─────────────────────┼─────────────────────┐
                        ↓                     ↓                     ↓
            Blind Path Nav      Crosswalk Nav      Object Search
                        ↓                     ↓                     ↓
                    YOLO Models           Traffic Light          YOLO-E
                        ↓                     ↓                     ↓
                                    Result Aggregation
                        ↓
                    Frame Annotation
                        ↓
                    WebSocket Broadcast → Browser Display
```

### Audio Processing Flow

```
Microphone → ESP32 → WebSocket → asr_core.py
                                        ↓
                              Speech Recognition
                                        ↓
                              Command Parsing
                                        ↓
                              Navigation Master
                                        ↓
                            Action Execution
                                        ↓
                            Audio Response Generation
                                        ↓
                            audio_player.py → Speaker
```

### IMU Data Flow

```
ESP32 IMU → WebSocket → app_main.py → Pose Estimation
                                            ↓
                                    Three.js Visualization
                                            ↓
                                    Browser 3D Display
```

## State Machine Diagram

```
                    [IDLE]
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
   [CHAT]    [BLINDPATH_NAV]   [CROSSING]
                      │             │
        ┌─────────────┼─────────────┼─────────────┐
        ↓             ↓             ↓             ↓
  [NAVIGATING]  [MANEUVERING]  [AVOIDING]   [SEEKING]
                      │
        ┌─────────────┼─────────────┐
        ↓             ↓             ↓
  [ITEM_SEARCH] [TRAFFIC_LIGHT]  [OTHER]
```

## Threading Model

**Main Thread:**
- FastAPI server
- WebSocket handlers
- State coordination

**Background Threads:**
- Video processing pipeline
- Audio processing pipeline
- Model inference (GPU queue)
- Recording service

**Synchronization:**
- Thread-safe queues for frame buffering
- Locks for shared state
- Async/await for I/O operations

## Performance Optimization

**GPU Acceleration:**
- CUDA for model inference
- Batch processing where possible
- Model quantization for faster inference

**Frame Rate Optimization:**
- Frame skipping for non-critical operations
- Downsampling for detection tasks
- Caching for repeated computations

**Memory Management:**
- Frame buffer limits
- Model unloading when not in use
- Garbage collection tuning

## Security Considerations

**Data Privacy:**
- Local processing for video/audio
- API key management via environment variables
- Optional encryption for sensitive data

**Network Security:**
- WebSocket authentication
- Rate limiting
- Input validation

## Scalability

**Horizontal Scaling:**
- Multiple camera support
- Load balancing for API calls
- Distributed processing options

**Vertical Scaling:**
- GPU memory optimization
- CPU-intensive task offloading
- Resource monitoring and adjustment

## Error Handling

**Model Failures:**
- Graceful degradation
- Fallback to simpler models
- Error logging and recovery

**Network Issues:**
- Reconnection logic
- Buffering for intermittent connections
- Offline mode capabilities

## Future Enhancements

**Planned Features:**
- Multi-language support
- Enhanced obstacle classification
- Indoor navigation
- Crowd navigation
- Real-time mapping

**Technical Improvements:**
- Model compression
- Edge computing support
- Cloud synchronization
- Advanced sensor fusion

## References

- YOLO: https://github.com/ultralytics/ultralytics
- MediaPipe: https://mediapipe.dev/
- FastAPI: https://fastapi.tiangolo.com/
- DashScope: https://dashscope.aliyun.com/

