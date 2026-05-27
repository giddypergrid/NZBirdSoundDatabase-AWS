import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
import DefaultHeader from 'staticComponents/DefaultHeader';
import Footer from 'staticComponents/Footer';

const LegalPage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      window.scrollTo({ top: 0 });
    }
  }, [location]);

  return (
    <div className="min-h-screen bg-forest-800 flex flex-col">
      <DefaultHeader />

      <main className="flex-1 py-16">
        <div className="max-w-3xl mx-auto px-6 text-white/80">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Legal & Contact
          </h1>
          <p className="text-sm text-white/40 mb-10">
            New Zealand Bird Sound Database
          </p>
          <section id="privacy" className="scroll-mt-24 mb-14">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Privacy policy
            </h2>
            <p className="mb-3">
              This website is a non-commercial educational project. We do not
              collect personal information, we do not run analytics, and we do
              not share any data with third parties.
            </p>
            <p className="mb-3">
              When you upload an audio recording to identify a bird, the file
              is sent to our server only for the purpose of running the
              classification model. We do not retain uploaded recordings.
            </p>
            <p>
              Bird images shown on the site are fetched live from third-party
              sources. Requests to those sources are made by your browser and
              are subject to their own privacy policies.
            </p>
          </section>

          <section id="terms" className="scroll-mt-24 mb-14">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Terms of service
            </h2>
            <p className="mb-3">
              The content on this site is provided for educational and research
              purposes only. Species identification results are produced by a
              machine learning model and may be incorrect; they should not be
              used as a substitute for expert ornithological advice.
            </p>
            <p className="mb-3">
              You agree not to use the service to upload unlawful content or to
              attempt to disrupt the service for other users.
            </p>
            <p>
              The site is provided "as is" without warranties of any kind. We
              may change or discontinue the service at any time.
            </p>
          </section>

          <section id="cookies" className="scroll-mt-24 mb-14">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Cookie settings
            </h2>
            <p className="mb-3">
              This site does not set any tracking or advertising cookies. We
              use one small piece of local browser storage to remember that you
              have dismissed the cookie notice, so it doesn't reappear on every
              page load.
            </p>
            <p className="mb-3">
              No personal data is stored in this entry and it never leaves your
              device. You can clear it at any time by clearing your browser
              site data for this domain.
            </p>
            <button
              onClick={() => {
                try {
                  localStorage.removeItem('cookieConsent');
                } catch {}
                window.location.reload();
              }}
              className="text-sm px-4 py-2 rounded-md border border-white/20 hover:bg-white/5 transition-colors"
            >
              Reset cookie notice
            </button>
          </section>

          <section id="data" className="scroll-mt-24 mb-14">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Data source & license
            </h2>
            <p className="mb-3">
              The bird audio used by this site comes from the{' '}
              <a
                href="https://www.kaggle.com/datasets/ollypowell/new-zealand-bird-sound"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                New Zealand Wildlife Short Sound Crops
              </a>{' '}
              dataset on Kaggle by <strong>Olly Powell</strong>, published on
              behalf of the{' '}
              <a
                href="https://www.doc.govt.nz/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                New Zealand Department of Conservation – Te Papa Atawhai
              </a>
              . It contains roughly 290,000 short labelled audio crops
              covering about 77 bird species plus the Tree Weta.
            </p>
            <p className="mb-3">
              The dataset is published under the{' '}
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                Creative Commons Attribution 4.0 International (CC BY 4.0)
              </a>{' '}
              license and is marked as freely accessible on Kaggle. Under
              CC BY 4.0 you are free to:
            </p>
            <ul className="list-disc pl-6 mb-3 space-y-1">
              <li>
                <strong>Share</strong> — copy and redistribute the material in
                any medium or format.
              </li>
              <li>
                <strong>Adapt</strong> — remix, transform, and build upon the
                material for any purpose, including commercially.
              </li>
            </ul>
            <p className="mb-3">
              The only requirement is <strong>attribution</strong>: you must
              give appropriate credit to the creator, link to the license, and
              indicate if changes were made.
            </p>
            <p className="mb-4 text-sm text-white/50">
              Suggested citation: Powell, O. (2024).{' '}
              <em>New Zealand Wildlife Short Sound Crops</em>. Kaggle, on
              behalf of the NZ Department of Conservation. Licensed under
              CC BY 4.0.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://www.kaggle.com/datasets/ollypowell/new-zealand-bird-sound"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white text-forest-900 font-medium hover:bg-white/90 transition-colors"
              >
                Download on Kaggle
              </a>
              <a
                href="https://creativecommons.org/licenses/by/4.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-white/20 text-white/80 hover:bg-white/5 transition-colors"
              >
                View CC BY 4.0 license
              </a>
              <a
                href="https://github.com/giddypergrid/NZBirdSoundDatabase-Backend"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-white/20 text-white/80 hover:bg-white/5 transition-colors"
              >
                View backend source on GitHub
              </a>
            </div>
            <p className="mt-4 text-sm text-white/50">
              This website's backend source code is open and available at{' '}
              <a
                href="https://github.com/giddypergrid/NZBirdSoundDatabase-Backend"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-white"
              >
                github.com/giddypergrid/NZBirdSoundDatabase-Backend
              </a>
              .
            </p>
          </section>

          <section id="contact" className="scroll-mt-24 mb-14">
            <h2 className="text-2xl font-semibold text-white mb-4">Contact</h2>
            <p className="mb-4">
              Questions, feedback or takedown requests are welcome.
            </p>
            <a
              href="mailto:sunziyuan000@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-white text-forest-900 font-medium hover:bg-white/90 transition-colors"
            >
              <Mail className="w-4 h-4" />
              sunziyuan000@gmail.com
            </a>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LegalPage;
