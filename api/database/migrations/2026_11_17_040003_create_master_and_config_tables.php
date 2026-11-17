<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('code', 64);
            $table->string('name');
            $table->boolean('is_incident')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'code']);
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('code', 64);
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'code']);
        });

        Schema::create('risk_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('level', 32);
            $table->string('label', 64);
            $table->unsignedInteger('min_score');
            $table->unsignedInteger('max_score');
            $table->unsignedInteger('first_response_hours');
            $table->unsignedInteger('temporary_action_hours');
            $table->unsignedInteger('permanent_action_hours');
            $table->boolean('requires_preventive_action')->default(false);
            $table->string('color_hex', 16)->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'level']);
            $table->index(['organization_id', 'min_score', 'max_score']);
        });

        Schema::create('configurations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('key', 64);
            $table->json('value');
            $table->string('description')->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configurations');
        Schema::dropIfExists('risk_configs');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('case_types');
    }
};
