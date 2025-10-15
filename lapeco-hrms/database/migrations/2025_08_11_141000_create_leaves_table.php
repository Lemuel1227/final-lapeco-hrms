<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leaves', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->enum('type', ['Vacation Leave', 'Sick Leave', 'Emergency Leave', 'Unpaid Leave', 'Maternity Leave', 'Paternity Leave']);
            $table->date('date_from');
            $table->date('date_to');
            $table->unsignedInteger('days');
            $table->enum('status', ['Pending', 'Approved', 'Declined', 'Canceled'])->default('Pending');
            $table->text('reason')->nullable();
            
            // Document attachment
            $table->string('document_name')->nullable();
            $table->string('document_path')->nullable();
            
            // Maternity leave specific fields
            $table->json('maternity_details')->nullable(); // Store maternity-specific data as JSON
            
            // Paternity leave specific fields
            $table->json('paternity_details')->nullable(); // Store paternity-specific data as JSON
            
            // Extension request fields
            $table->enum('extension_status', ['Pending', 'Approved', 'Declined'])->nullable();
            $table->date('extension_date_to')->nullable();
            $table->text('extension_reason')->nullable();
            $table->timestamp('extension_requested_at')->nullable();
            
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leaves');
    }
};


