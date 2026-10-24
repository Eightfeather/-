using System;
using System.IO;
using System.Windows.Forms;

namespace TheLetheWorkbench
{
    internal static class Program
    {
        [STAThread]
        private static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            ServerRunner runner = null;
            try
            {
                string runtime = Payload.Ensure();
                Native.Prepare(runtime);
                Payload.CleanupOld(runtime);

                runner = new ServerRunner(runtime, Payload.LogDir);
                ServerInfo info = runner.Start();

                WebView2Bootstrap.Run(info, runner);
            }
            catch (Exception ex)
            {
                string log = Path.Combine(Payload.LogDir, "startup-error.log");
                try { File.WriteAllText(log, ex.ToString()); } catch { }
                MessageBox.Show(
                    ex.Message + Environment.NewLine + Environment.NewLine + "详细日志：" + log,
                    "The Lethe Workbench 启动失败",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
            finally
            {
                if (runner != null) runner.Dispose();
            }
        }
    }
}