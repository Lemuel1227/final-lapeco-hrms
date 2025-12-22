<?php

namespace App\Http\Controllers;

use App\Models\SystemSetting;
use Illuminate\Http\Request;

class SystemSettingController extends Controller
{
    /**
     * Get a specific setting by key.
     */
    public function show($key)
    {
        $value = SystemSetting::getValue($key);
        return response()->json(['key' => $key, 'value' => $value]);
    }

    /**
     * Update or create a setting.
     */
    public function store(Request $request)
    {
        $request->validate([
            'key' => 'required|string',
            'value' => 'required', // Value can be anything, but usually string or json
        ]);

        $key = $request->input('key');
        $value = $request->input('value');

        // If value is array, encode it
        if (is_array($value)) {
            $value = json_encode($value);
        }

        SystemSetting::setValue($key, $value);

        return response()->json(['message' => 'Setting saved successfully', 'key' => $key, 'value' => $value]);
    }
    
    /**
     * Get multiple settings at once (optional, but useful)
     */
    public function index(Request $request)
    {
        // If keys query param is provided, filter by those keys
        if ($request->has('keys')) {
            $keys = explode(',', $request->input('keys'));
            $settings = SystemSetting::whereIn('key', $keys)->pluck('value', 'key');
            return response()->json($settings);
        }
        
        return response()->json(SystemSetting::all()->pluck('value', 'key'));
    }
}
