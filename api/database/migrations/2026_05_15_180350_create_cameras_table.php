<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cameras', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('url')->nullable();           // RTSP / stream source reference
            $table->string('embed_url')->nullable();      // YouTube/EarthCam iframe src
            $table->string('stream_type')->default('youtube'); // youtube | earthcam | rtsp
            $table->string('location')->nullable();
            $table->string('zone')->nullable();
            $table->enum('status', ['active', 'inactive', 'offline'])->default('active');
            $table->boolean('ptz')->default(false);
            $table->integer('crowd_count')->default(0);  // live running count
            $table->string('assigned_person')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cameras');
    }
};
