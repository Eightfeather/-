using System;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace TheLetheWorkbench
{
    internal sealed class MainForm : Form
    {
        private readonly WebView2 _web;
        private readonly ServerRunner _runner;
        private readonly ServerInfo _info;

        public MainForm(ServerInfo info, ServerRunner runner)
        {
            _info = info;
            _runner = runner;

            Text = "The Lethe Workbench";
            var wa = Screen.PrimaryScreen.WorkingArea;
            Width = Math.Max(1200, (int)(wa.Width * 0.92));
            Height = Math.Max(800, (int)(wa.Height * 0.92));
            MinimumSize = new Size(1100, 720);
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = ColorTranslator.FromHtml("#12100E");
            DoubleBuffered = true;

            _web = new WebView2
            {
                Dock = DockStyle.Fill,
                DefaultBackgroundColor = ColorTranslator.FromHtml("#12100E"),
                AllowExternalDrop = false,
            };
            Controls.Add(_web);
            Load += OnLoadAsync;
        }

        private async void OnLoadAsync(object sender, EventArgs e)
        {
            try
            {
                string userData = Path.Combine(Payload.DataDir, "webview2");
                Directory.CreateDirectory(userData);
                CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, userData);
                await _web.EnsureCoreWebView2Async(env);

                _web.CoreWebView2.Settings.AreDevToolsEnabled = false;
                _web.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
                _web.CoreWebView2.Settings.IsStatusBarEnabled = false;
                _web.CoreWebView2.Settings.IsZoomControlEnabled = false;
                _web.CoreWebView2.Settings.AreBrowserAcceleratorKeysEnabled = false;
                _web.CoreWebView2.Settings.IsSwipeNavigationEnabled = false;

                _web.CoreWebView2.Navigate(_info.Url);
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "界面引擎（WebView2）初始化失败：" + ex.Message,
                    "The Lethe Workbench",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }

        protected override void OnFormClosed(FormClosedEventArgs e)
        {
            base.OnFormClosed(e);
            try { _runner.Dispose(); } catch { }
        }
    }
}