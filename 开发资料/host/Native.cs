using System;
using System.IO;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;

namespace TheLetheWorkbench
{
    internal static class Native
    {
        [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr LoadLibraryW(string path);

        [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern bool SetDllDirectoryW(string path);

        [DllImport("kernel32", CharSet = CharSet.Unicode, SetLastError = true)]
        private static extern IntPtr CreateJobObjectW(IntPtr attrs, string name);

        [DllImport("kernel32", SetLastError = true)]
        private static extern bool SetInformationJobObject(IntPtr job, int infoClass, IntPtr info, uint infoLen);

        [DllImport("kernel32", SetLastError = true)]
        private static extern bool AssignProcessToJobObject(IntPtr job, IntPtr process);

        [DllImport("kernel32", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr handle);

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
        {
            public long PerProcessUserTimeLimit;
            public long PerJobUserTimeLimit;
            public uint LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public uint ActiveProcessLimit;
            public UIntPtr Affinity;
            public uint PriorityClass;
            public uint SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct IO_COUNTERS
        {
            public ulong ReadOperationCount;
            public ulong WriteOperationCount;
            public ulong OtherOperationCount;
            public ulong ReadTransferCount;
            public ulong WriteTransferCount;
            public ulong OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryUsed;
            public UIntPtr PeakJobMemoryUsed;
        }

        private const int JobObjectExtendedLimitInformation = 9;
        private const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x2000;

        private static IntPtr _job;

        /// <summary>创建一个“随宿主关闭而杀掉全部子进程”的 Job Object（宿主被强杀时也生效）。</summary>
        public static IntPtr EnsureKillOnCloseJob()
        {
            if (_job != IntPtr.Zero) return _job;
            IntPtr job = CreateJobObjectW(IntPtr.Zero, null);
            if (job == IntPtr.Zero) return IntPtr.Zero;
            var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            int size = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
            IntPtr ptr = Marshal.AllocHGlobal(size);
            try
            {
                Marshal.StructureToPtr(info, ptr, false);
                if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, ptr, (uint)size))
                {
                    CloseHandle(job);
                    return IntPtr.Zero;
                }
            }
            finally { Marshal.FreeHGlobal(ptr); }
            _job = job;
            return _job;
        }

        /// <summary>把子进程放进 Job，让它在宿主异常退出时一起被系统回收。</summary>
        public static bool AssignToKillOnCloseJob(System.Diagnostics.Process p)
        {
            try
            {
                IntPtr job = EnsureKillOnCloseJob();
                if (job == IntPtr.Zero) return false;
                return AssignProcessToJobObject(job, p.Handle);
            }
            catch { return false; }
        }

        private static string _runtimeDir;

        /// <summary>先把 WebView2Loader.dll 与托管程序集解析准备好，再让任何 WebView2 类型被触碰。</summary>
        public static void Prepare(string runtimeDir)
        {
            _runtimeDir = runtimeDir;
            SetDllDirectoryW(runtimeDir);
            LoadLibraryW(Path.Combine(runtimeDir, "WebView2Loader.dll"));
            AppDomain.CurrentDomain.AssemblyResolve += ResolveManaged;
        }

        private static Assembly ResolveManaged(object sender, ResolveEventArgs args)
        {
            try
            {
                string simple = new AssemblyName(args.Name).Name + ".dll";
                string candidate = Path.Combine(_runtimeDir, simple);
                if (File.Exists(candidate)) return Assembly.LoadFrom(candidate);
            }
            catch { /* ignore */ }
            return null;
        }
    }

    internal static class WebView2Bootstrap
    {
        [MethodImpl(MethodImplOptions.NoInlining)]
        public static void Run(ServerInfo info, ServerRunner runner)
        {
            System.Windows.Forms.Application.Run(new MainForm(info, runner));
        }
    }
}