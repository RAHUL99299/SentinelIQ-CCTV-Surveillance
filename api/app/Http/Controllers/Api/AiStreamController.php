<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AiStreamController extends Controller
{
    private function aiBase(): string
    {
        return rtrim(config('sentinel.ai_service_url', 'http://127.0.0.1:5000'), '/');
    }

    /** MJPEG live stream (proxied from Flask). */
    public function videoFeed(Request $request): StreamedResponse
    {
        return $this->proxyStream($request, '/video_feed');
    }

    /** Lightweight MJPEG without YOLO (when Flask supports it). */
    public function videoFeedLite(Request $request): StreamedResponse
    {
        return $this->proxyStream($request, '/video_feed_lite');
    }

    /** Single JPEG frame. */
    public function livePreview(Request $request)
    {
        $query = $request->query();
        $url = $this->aiBase().'/api/live_preview?'.http_build_query($query);

        try {
            $response = Http::timeout(90)->get($url);
            if ($response->successful()) {
                return response($response->body(), 200, [
                    'Content-Type' => 'image/jpeg',
                    'Cache-Control' => 'no-store',
                ]);
            }
        } catch (\Throwable) {
            // fall through
        }

        return response()->json([
            'message' => 'AI preview unavailable. Ensure ai-service is running on port 5000.',
        ], 503);
    }

    public function health()
    {
        try {
            $response = Http::timeout(5)->get($this->aiBase().'/api/health');
            if ($response->successful()) {
                return response()->json($response->json());
            }
        } catch (\Throwable) {
            //
        }

        try {
            $ping = Http::timeout(3)->get($this->aiBase().'/api/resolve_source', ['source' => 'auto']);
            if ($ping->status() !== 502) {
                return response()->json([
                    'status' => 'ok',
                    'features' => ['video_feed', 'resolve_source'],
                ]);
            }
        } catch (\Throwable) {
            //
        }

        return response()->json(['status' => 'offline'], 503);
    }

    private function proxyStream(Request $request, string $path): StreamedResponse
    {
        $query = $request->query();
        $upstream = $this->aiBase().$path.'?'.http_build_query($query);

        return response()->stream(function () use ($upstream) {
            $context = stream_context_create([
                'http' => [
                    'timeout' => 120,
                    'header' => "Accept: multipart/x-mixed-replace\r\n",
                ],
            ]);
            $in = @fopen($upstream, 'r', false, $context);
            if ($in === false) {
                return;
            }
            while (! feof($in)) {
                $chunk = fread($in, 16384);
                if ($chunk === false) {
                    break;
                }
                echo $chunk;
                if (connection_aborted()) {
                    break;
                }
                flush();
            }
            fclose($in);
        }, 200, [
            'Content-Type' => 'multipart/x-mixed-replace; boundary=frame',
            'Cache-Control' => 'no-store, no-cache, must-revalidate',
            'Pragma' => 'no-cache',
            'Connection' => 'keep-alive',
            'X-Accel-Buffering' => 'no',
        ]);
    }
}
