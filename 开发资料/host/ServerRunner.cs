using System;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;

namespace TheLetheWorkbench
{
    internal sealed class ServerInfo
    {
        public int Port;
        public string Token;
        public string LetheRoot;
        public string Url { get { return "http://127.0.0.1:" + Port + "/"; } }
    }

    /// <summary>拉起内嵌后端进程，等它吐出握手行，拿端口与令牌。</summary>
    internal sealed class ServerRunner : IDisposable
    {
        private Process _process;
        private readonly string _exePath;
        private readonly string _logDir;

        public ServerRunner(string runtimeDir, string logDir)
        {
            _exePath = Path.Combine(runtimeDir, "server.exe");
            _logDir = logDir;
        }

        public ServerInfo Start(int timeoutMs = 40000)
        {
            if (!File.Exists(_exePath)) throw new FileNotFoundException("后端可执行文件缺失", _exePath);

            var psi = new ProcessStartInfo(_exePath, "serve --no-open --port=0")
            {
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                WorkingDirectory = Path.GetDirectoryName(_exePath),
                StandardOutputEncoding = Encoding.UTF8,
                StandardErrorEncoding = Encoding.UTF8,
            };
            psi.EnvironmentVariables["LETHE_WB_HANDSHAKE"] = "1";

            string logPath = Path.Combine(_logDir, "server.log");
            var log = new StringBuilder();
            _process = new Process { StartInfo = psi, EnableRaisingEvents = true };
            _process.OutputDataReceived += (s, e) =>
            {
                if (e.Data == null) return;
                lock (log) { log.AppendLine("[out] " + e.Data); }
            };
            _process.ErrorDataReceived += (s, e) =>
            {
                if (e.Data == null) return;
                lock (log) { log.AppendLine("[err] " + e.Data); }
            };
            _process.Start();
            Native.AssignToKillOnCloseJob(_process);
            _process.BeginOutputReadLine();
            _process.BeginErrorReadLine();

            var ready = new ManualResetEventSlim(false);
            ServerInfo info = null;
            var pattern = new Regex("WB-READY\\s+(\\{.*\\})", RegexOptions.Compiled);

            DataReceivedEventHandler watch = (s, e) =>
            {
                if (e.Data == null) return;
                Match m = pattern.Match(e.Data);
                if (!m.Success) return;
                string json = m.Groups[1].Value;
                info = new ServerInfo
                {
                    Port = int.Parse(Regex.Match(json, "\"port\":(\\d+)").Groups[1].Value),
                    Token = Regex.Match(json, "\"token\":\"([0-9a-fA-F]+)\"").Groups[1].Value,
                    LetheRoot = Regex.Match(json, "\"letheRoot\":\"((?:[^\"\\\\]|\\\\.)*)\"").Groups[1].Value,
                };
                ready.Set();
            };
            _process.OutputDataReceived += watch;

            if (!ready.Wait(timeoutMs))
            {
                string tail;
                lock (log) { tail = log.ToString(); }
                try { File.WriteAllText(logPath, tail, Encoding.UTF8); } catch { }
                try { if (!_process.HasExited) _process.Kill(); } catch { }
                throw new TimeoutException("后端启动超时。日志：" + logPath + Environment.NewLine + tail);
            }

            try { lock (log) { File.WriteAllText(logPath, log.ToString(), Encoding.UTF8); } } catch { }
            return info;
        }

        public void Dispose()
        {
            try
            {
                if (_process != null && !_process.HasExited)
                {
                    _process.Kill();
                    _process.WaitForExit(3000);
                }
            }
            catch { /* ignore */ }
            finally
            {
                if (_process != null) _process.Dispose();
                _process = null;
            }
        }
    }
}