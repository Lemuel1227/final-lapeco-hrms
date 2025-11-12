# ML System Troubleshooting Guide

## Issue: WinError 10106 when running through Laravel

### Problem Description
The error `OSError: [WinError 10106] The requested service provider could not be loaded or initialized` occurs when Laravel's Symfony Process tries to run the Python ML script on Windows.

This is a Windows-specific issue related to how PHP spawns Python subprocesses and how Python's asyncio (used by sklearn/joblib) initializes Windows socket providers.

### Root Cause
When PHP (via Symfony Process) spawns a Python subprocess on Windows:
1. The subprocess doesn't inherit all environment variables properly
2. Windows socket/network APIs fail to initialize
3. Python's asyncio module (imported by joblib/sklearn) crashes

### Solutions Attempted

#### ✅ Solution 1: Try-Except Import Protection (CURRENT)
```python
# In employee_ml_predictor.py
import platform
if platform.system() == 'Windows':
    try:
        import asyncio
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass
```

#### ✅ Solution 2: Pass Full Environment (CURRENT)
```php
// In MLPredictionController.php
$env = $_SERVER;  // Inherit full environment
$env['SYSTEMROOT'] = env('SYSTEMROOT', 'C:\\Windows');
$process->setEnv($env);
```

### Alternative Solutions if Still Failing

#### Option A: Use Shell Execution Instead of Process
```php
// More complex but might work better on Windows
$command = escapeshellcmd("python {$this->scriptPath} {$dbHost} {$dbPort} {$dbDatabase} {$dbUsername}");
$output = shell_exec($command);
```

#### Option B: Write Predictions to File
```php
// Python writes to predictions.json
// PHP reads the file
$process->run();
$predictions = json_decode(file_get_contents('ml_scripts/predictions.json'), true);
```

#### Option C: Use HTTP Server Instead
```python
# Run Python as a Flask/FastAPI server
# Laravel makes HTTP requests to it
# Completely separate process
```

#### Option D: Lazy Load sklearn
```python
# Don't import sklearn at module level
# Import it only inside functions when needed
def train_model(self, df):
    from sklearn.ensemble import RandomForestClassifier  # Import here
    model = RandomForestClassifier(...)
```

### Current Status
- ✅ Python script works perfectly when run directly
- ✅ Database connection successful  
- ✅ ML model trains and generates predictions
- ❌ Fails when executed through Laravel Process on Windows

### Recommended Next Steps if Still Failing

1. **Check Windows Event Viewer**
   - Open Event Viewer → Windows Logs → Application
   - Look for Python or PHP errors

2. **Test with Simple Script**
   ```bash
   python test_simple.py 127.0.0.1 3307 lapeco_hrms root
   ```
   If this works through Laravel but full script doesn't, it's definitely the sklearn/asyncio issue.

3. **Check SYSTEMROOT Environment Variable**
   ```bash
   echo %SYSTEMROOT%
   ```
   Should be `C:\Windows`

4. **Verify PHP Can Access Environment**
   ```php
   dd(env('SYSTEMROOT'), $_SERVER['SYSTEMROOT']);
   ```

### Workaround: Disable ML Temporarily
If you need the system working immediately while debugging:

1. The frontend already has fallback to rule-based predictions
2. ML predictions are optional enhancement
3. System works fine without ML (just won't show "ML Enhanced" badge)

### Contact Support Resources
- [Symfony Process on Windows](https://symfony.com/doc/current/components/process.html)
- [Python asyncio Windows Issues](https://docs.python.org/3/library/asyncio-platforms.html#windows)
- [PHP subprocess on Windows](https://www.php.net/manual/en/function.proc-open.php)
