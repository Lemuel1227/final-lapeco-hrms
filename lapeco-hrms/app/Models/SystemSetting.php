<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SystemSetting extends Model
{
    protected $table = 'system_settings';
    protected $fillable = ['key', 'value'];

    public static function getValue(string $key, $default = null)
    {
        $setting = static::where('key', $key)->first();
        return $setting ? $setting->value : $default;
    }

    public static function setValue(string $key, $value)
    {
        return static::updateOrCreate(['key' => $key], ['value' => $value]);
    }

    public static function getJson(string $key, array $default = [])
    {
        $raw = static::getValue($key);
        if (!$raw) return $default;
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : $default;
    }

    public static function setJson(string $key, array $value)
    {
        return static::setValue($key, json_encode($value));
    }
}
