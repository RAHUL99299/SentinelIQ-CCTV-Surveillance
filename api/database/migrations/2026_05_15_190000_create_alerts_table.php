<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('camera_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->string('type')->default('Motion Detected'); // Intrusion, Fight, Loitering, etc.
            $table->enum('severity', ['critical', 'high', 'medium', 'low'])->default('medium');
            $table->enum('status', ['open', 'acknowledged', 'resolved', 'closed'])->default('open');
            $table->integer('confidence')->default(80); // 0-100 AI confidence %
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('alerts');
    }
};
