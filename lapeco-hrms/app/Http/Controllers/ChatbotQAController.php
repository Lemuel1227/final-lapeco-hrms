<?php

namespace App\Http\Controllers;

use App\Models\ChatbotQA;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChatbotQAController extends Controller
{
    public function publicIndex(Request $request)
    {
        $type = $request->query('type');
        $query = ChatbotQA::query()->where('active', true);
        if ($type) { $query->where('type', $type); }
        return response()->json(['data' => $query->orderBy('id', 'desc')->get()]);
    }

    public function index(Request $request)
    {
        $type = $request->query('type');
        $query = ChatbotQA::query();
        if ($type) { $query->where('type', $type); }
        return response()->json(['data' => $query->orderBy('id', 'desc')->get()]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['recruitment','faq'])],
            'question' => ['required','string','min:3'],
            'answer' => ['required','string','min:1'],
            'tags' => ['nullable','array'],
            'active' => ['sometimes','boolean'],
        ]);
        $qa = new ChatbotQA($validated);
        $qa->created_by = $request->user()->id ?? null;
        $qa->active = array_key_exists('active', $validated) ? (bool)$validated['active'] : true;
        $qa->save();
        return response()->json(['qa' => $qa], 201);
    }

    public function update(Request $request, ChatbotQA $qa)
    {
        $validated = $request->validate([
            'type' => [Rule::in(['recruitment','faq'])],
            'question' => ['sometimes','string','min:3'],
            'answer' => ['sometimes','string','min:1'],
            'tags' => ['nullable','array'],
            'active' => ['sometimes','boolean'],
        ]);
        $qa->fill($validated);
        if (array_key_exists('tags', $validated) && $validated['tags'] === null) { $qa->tags = null; }
        $qa->save();
        return response()->json(['qa' => $qa]);
    }

    public function destroy(ChatbotQA $qa)
    {
        $qa->delete();
        return response()->json(['deleted' => true]);
    }
}