<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatbotQA extends Model
{
    use HasFactory;

    protected $table = 'chatbot_qas';

    protected $fillable = [
        'type',
        'question',
        'answer',
        'dynamic_handler',
        'tags',
        'active',
        'created_by',
    ];

    protected $casts = [
        'tags' => 'array',
        'active' => 'boolean',
    ];
}