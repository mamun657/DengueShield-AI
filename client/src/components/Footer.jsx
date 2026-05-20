import { Link } from "react-router-dom";

const socialItems = [
  { label: "Facebook", short: "f", href: "#" },
  { label: "Instagram", short: "i", href: "#" },
  { label: "LinkedIn", short: "in", href: "#" },
];

const Footer = () => {
  return (
    <footer id="contact" className="relative z-20 border-t border-white/10 bg-[#0a1428]/85 text-slate-300 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 py-14 md:px-10">
        <div className="mb-10 grid gap-4 rounded-3xl border border-[#d7e6ee30] bg-gradient-to-r from-[#e8f5f916] to-[#d5f0ea0f] p-5 md:grid-cols-[1.2fr_0.8fr] md:p-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-cyan-200/70">Health Alerts Newsletter</p>
            <h4 className="mt-2 text-xl font-semibold text-white">Get clinical insights and prevention guidance</h4>
            <p className="mt-2 text-sm text-slate-400">Weekly health updates tailored for families and care teams in Bangladesh.</p>
          </div>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-teal-200/50"
            />
            <button
              type="submit"
              className="rounded-xl bg-gradient-to-r from-teal-200 to-emerald-200 px-4 py-2.5 text-sm font-semibold text-[#06353f] transition duration-300 hover:-translate-y-0.5"
            >
              Subscribe
            </button>
          </form>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-4 md:gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500/10 p-1.5 shadow-[0_0_12px_rgba(34,211,238,0.2)]">
                <img src="/dengue-icon.png" alt="DengueShield AI Logo" className="h-full w-full object-contain [filter:invert(85%)_sepia(45%)_saturate(448%)_hue-rotate(130deg)_brightness(102%)_contrast(106%)] drop-shadow-[0_0_4px_rgba(34,211,238,0.6)]" />
              </div>
              <h3 className="text-2xl font-semibold text-white">DengueShield AI</h3>
            </div>
            <p className="max-w-sm text-sm leading-7 text-slate-400">
              Trusted AI healthcare platform for early dengue risk detection, monitoring, and family safety.
            </p>
            <p className="text-sm text-slate-400">Phone: +8801874379798</p>
            <p className="text-sm text-slate-400">Location: 123 Health Avenue, Chattogram, Bangladesh</p>
          </div>

          <div id="resources">
            <h4 className="mb-4 text-base font-semibold text-white">Quick Links</h4>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li><Link className="transition hover:text-cyan-200" to="/dashboard">Dashboard</Link></li>
              <li><Link className="transition hover:text-cyan-200" to="/reports">Reports</Link></li>
              <li><Link className="transition hover:text-cyan-200" to="/dashboard">Alerts</Link></li>
              <li><Link className="transition hover:text-cyan-200" to="/dashboard">Resources</Link></li>
              <li><Link className="transition hover:text-cyan-200" to="/">About Us</Link></li>
              <li><Link className="transition hover:text-cyan-200" to="/">Contact</Link></li>
              <li><Link className="transition hover:text-cyan-200" to="/">Privacy Policy</Link></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-base font-semibold text-white">Support</h4>
            <p className="text-sm text-slate-400">Clinical support hours: 24/7 monitoring desk</p>
            <p className="text-sm text-slate-400">Email: support@dengueshield.ai</p>
            <p className="text-sm text-slate-400">Emergency hotline: +880 1874-379798</p>
          </div>

          <div className="space-y-5">
            <h4 className="text-base font-semibold text-white">Connect</h4>
            <div className="flex items-center gap-3">
              {socialItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  aria-label={item.label}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:border-cyan-200/40 hover:bg-cyan-300/10"
                >
                  {item.short}
                </a>
              ))}
            </div>
            <p className="text-sm leading-7 text-slate-400">
              DengueShield AI is an AI-powered health monitoring platform designed
              to help families detect dengue risks early and take preventive actions.
            </p>
            <a
              href="#"
              className="inline-flex rounded-xl border border-rose-200/35 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:bg-rose-500/20"
            >
              Emergency Contact Support
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-3 border-t border-white/10 pt-6 text-sm text-slate-500 md:flex-row">
          <p>© 2026 DengueShield AI</p>
          <div className="flex gap-4">
            <Link className="transition hover:text-cyan-200" to="/">Privacy Policy</Link>
            <Link className="transition hover:text-cyan-200" to="/">Terms of Service</Link>
          </div>
        </div>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          Clinical disclaimer: DengueShield AI provides decision support and does not replace licensed medical diagnosis or emergency care.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
