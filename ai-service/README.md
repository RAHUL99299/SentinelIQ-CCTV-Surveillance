# SentinelIQ Python AI Microservice

This is the standalone AI Microservice for the SentinelIQ project. It utilizes **Flask**, **OpenCV**, and **YOLOv8** to process live camera feeds, detect crowds/people, and stream the results over HTTP.

This architecture cleanly separates heavy AI processing from your Laravel/React web application stack.

## Setup Instructions

1. Ensure you have Python 3.8+ installed.
2. Open a terminal in this `ai-service` folder.
3. It is recommended to create a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
4. Install the required dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Running the Service

1. Run the Flask application:
   ```bash
   python app.py
   ```
   *(Note: The first time you run this, it will automatically download the `yolov8n.pt` model weights, which is about 6MB).*

2. The service will start on port `5000`.

## Integration with Laravel & React

*   **Live Video Stream:** `http://localhost:5000/video_feed`
    *   *Usage:* Use this URL directly as the `src` of an `<img>` tag in your React frontend. It streams Motion JPEG (MJPEG) with bounding boxes drawn over the detected people.
*   **Live JSON Stats:** `http://localhost:5000/api/stats`
    *   *Usage:* Your Laravel backend can periodically poll this endpoint using Laravel's HTTP Client (`Http::get()`) to record the crowd count in the database, calculate averages, and trigger alerts if the count exceeds a threshold.
