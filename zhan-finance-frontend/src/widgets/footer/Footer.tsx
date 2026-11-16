import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, User, Briefcase, Send } from "lucide-react";
import { ContactForm } from "@/features/contact-form/ContactForm";
import { ROUTES } from "@/shared/config/routes";
import { useTranslation } from "react-i18next";
import { BrandLogo } from "@/shared/ui/BrandLogo";

interface FooterProps {
  id?: string;
}

export function Footer({ id = 'contact' }: FooterProps) {
  const { t } = useTranslation('common');
  return (
    <footer id={id} className="bg-brand-green pt-16 sm:pt-24 pb-10 sm:pb-12 text-brand-beige rounded-t-[32px] sm:rounded-t-[40px] mt-[-32px] sm:mt-[-40px] relative z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 mb-14 sm:mb-20">
          <div className="space-y-8 sm:space-y-12">
            <div>
              <div className="mb-4 sm:mb-6">
                <BrandLogo variant="inverted" className="h-14 sm:h-16 md:h-20 w-auto" />
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase leading-[1.1] tracking-tight break-words">
                {t('footer.slogan1')}
                <br />
                {t('footer.slogan2')}
              </h2>
            </div>

            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="font-bold uppercase tracking-widest text-sm opacity-50 mb-2">
                  {t('footer.navigation')}
                </h4>
                <ul className="space-y-3 font-medium">
                  <li>
                    <Link
                      to={ROUTES.HOME}
                      className="hover:text-white transition-colors"
                    >
                      {t('publicNav.home')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={ROUTES.SERVICES}
                      className="hover:text-white transition-colors"
                    >
                      {t('publicNav.services')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={ROUTES.ABOUT}
                      className="hover:text-white transition-colors"
                    >
                      {t('publicNav.about')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to={ROUTES.LOGIN}
                      className="hover:text-white transition-colors"
                    >
                      {t('publicNav.login')}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h4 className="font-bold uppercase tracking-widest text-sm opacity-50 mb-2">
                  {t('footer.contacts')}
                </h4>
                <ul className="space-y-4 font-medium">
                  <li>
                    <div className="flex flex-col gap-2">
                      <a
                        href="https://wa.me/77750584021"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 hover:text-white transition-colors font-bold text-brand-beige"
                      >
                        <Phone className="w-5 h-5 text-brand-beige" />
                        WhatsApp: +7 (775) 058-40-21
                      </a>
                      <a
                        href="tel:+77759573787"
                        className="flex items-center gap-3 hover:text-white transition-colors"
                      >
                        <Phone className="w-5 h-5" />
                        +7-775-957-37-87
                      </a>
                      <a
                        href="tel:+77252522309"
                        className="flex items-center gap-3 hover:text-white transition-colors"
                      >
                        <Phone className="w-5 h-5" />
                        +7 (7252) 52-23-09
                      </a>
                    </div>
                  </li>
                  <li>
                    <div className="flex flex-col gap-1.5">
                      <a
                        href="mailto:support@zhanfinance.kz"
                        className="flex items-center gap-3 hover:text-white transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        support@zhanfinance.kz
                      </a>
                      <a
                        href="mailto:info@zhanfinance.kz"
                        className="flex items-center gap-3 hover:text-white transition-colors"
                      >
                        <Mail className="w-5 h-5" />
                        info@zhanfinance.kz
                      </a>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 shrink-0 mt-1" />
                    <span>
                      {t('footer.address')}
                      <br />
                      ЖАН FINANCE
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-8 items-center pt-2">
              <div className="flex gap-4">
                <a
                  href="https://t.me/mrsgemaseny"
                  className="w-12 h-12 rounded-full border border-brand-beige/20 flex items-center justify-center hover:bg-brand-beige hover:text-brand-green transition-all"
                >
                  <User className="w-5 h-5" />
                </a>
                <a
                  href="https://wa.me/77750584021"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full border border-brand-beige/20 flex items-center justify-center hover:bg-brand-beige hover:text-brand-green transition-all"
                >
                  <Phone className="w-5 h-5" />
                </a>
                <a
                  href="https://2gis.kz/shymkent/search/zhanfinance/firm/70000001060962340/69.629124%2C42.354754?m=69.629774%2C42.354893%2F16.83"
                  className="w-12 h-12 rounded-full border border-brand-beige/20 flex items-center justify-center hover:bg-brand-beige hover:text-brand-green transition-all"
                >
                  <Send className="w-5 h-5" />
                </a>
              </div>

              <div className="text-xs text-brand-beige/80 space-y-1">
                <p className="font-bold text-brand-beige">ТОО «ЖАН FINANCE»</p>
                <p>БИН: 240140023819</p>
                <p>г. Алматы, пр. Достык, 180</p>
              </div>
            </div>
          </div>

          <div className="bg-brand-beige text-brand-green p-8 md:p-12 rounded-[32px]">
            <ContactForm title={t('footer.discussTask')} showMessage={true} />
          </div>
        </div>

        <div className="pt-8 border-t border-brand-beige/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm font-medium opacity-75">
          <p>© {new Date().getFullYear()} ТОО «ЖАН FINANCE». {t('footer.allRightsReserved')}</p>
          <div className="flex flex-wrap gap-4 md:gap-6 text-xs md:text-sm">
            <Link to={ROUTES.PRIVACY_POLICY} className="hover:text-white transition-colors">
              {t('footer.privacy')}
            </Link>
            <Link to={ROUTES.TERMS} className="hover:text-white transition-colors">
              {t('footer.terms')}
            </Link>
            <Link to={ROUTES.REFUND_POLICY} className="hover:text-white transition-colors">
              {t('footer.refund')}
            </Link>
            <Link to={ROUTES.COOKIE_POLICY} className="hover:text-white transition-colors">
              {t('footer.cookies')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
