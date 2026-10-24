using System;
using System.Globalization;
using System.IO;
using System.IO.Compression;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;

namespace TheLetheWorkbench
{
    /// <summary>把内嵌的后端与 WebView2 运行时解到 %LOCALAPPDATA%，进程退出后可复用。</summary>
    internal static class Payload
    {
        private const string Prefix = "payload.";

        public static string DataDir
        {
            get
            {
                string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                return Path.Combine(local, "LetheWorkbench");
            }
        }

        public static string LogDir
        {
            get
            {
                string dir = Path.Combine(DataDir, "logs");
                Directory.CreateDirectory(dir);
                return dir;
            }
        }

        /// <summary>解包并返回运行目录（按内容签名分目录，升级后自动换新目录）。</summary>
        public static string Ensure()
        {
            Assembly asm = Assembly.GetExecutingAssembly();
            string[] names = asm.GetManifestResourceNames();
            var sb = new StringBuilder();
            long total = 0;
            foreach (string n in names)
            {
                if (!n.StartsWith(Prefix, StringComparison.Ordinal)) continue;
                using (Stream s = asm.GetManifestResourceStream(n))
                {
                    total += s.Length;
                }
            }
            sb.Append(total.ToString(CultureInfo.InvariantCulture));
            foreach (string n in names)
            {
                if (!n.StartsWith(Prefix, StringComparison.Ordinal)) continue;
                using (Stream s = asm.GetManifestResourceStream(n))
                {
                    using (var md5 = MD5.Create())
                    {
                        byte[] hash = md5.ComputeHash(s);
                        sb.Append('.').Append(BitConverter.ToString(hash).Replace("-", string.Empty).Substring(0, 8));
                    }
                }
            }

            string stamp = sb.ToString();
            string dir = Path.Combine(DataDir, "runtime", stamp);
            Directory.CreateDirectory(dir);

            foreach (string name in names)
            {
                if (!name.StartsWith(Prefix, StringComparison.Ordinal)) continue;
                string file = name.Substring(Prefix.Length);
                string target = Path.Combine(dir, file);
                if (File.Exists(target) && new FileInfo(target).Length > 0) continue;

                using (Stream src = asm.GetManifestResourceStream(name))
                {
                    if (file.EndsWith(".gz", StringComparison.OrdinalIgnoreCase))
                    {
                        string inner = target.Substring(0, target.Length - 3);
                        if (File.Exists(inner) && new FileInfo(inner).Length > 0) continue;
                        using (var gz = new GZipStream(src, CompressionMode.Decompress))
                        using (FileStream fs = File.Create(inner))
                        {
                            gz.CopyTo(fs);
                        }
                    }
                    else
                    {
                        using (FileStream fs = File.Create(target))
                        {
                            src.CopyTo(fs);
                        }
                    }
                }
            }

            return dir;
        }

        public static void CleanupOld(string keepDir)
        {
            try
            {
                string baseDir = Path.Combine(DataDir, "runtime");
                if (!Directory.Exists(baseDir)) return;
                foreach (string d in Directory.GetDirectories(baseDir))
                {
                    if (string.Equals(d, keepDir, StringComparison.OrdinalIgnoreCase)) continue;
                    try { Directory.Delete(d, true); } catch { /* 被占用就留到下次 */ }
                }
            }
            catch { /* ignore */ }
        }
    }
}