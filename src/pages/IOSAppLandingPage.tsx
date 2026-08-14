import React, { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import {
  AnimatePresence,
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  Github,
  Mic,
  Route,
  Sparkles,
} from 'lucide-react';
import PublicHeader from '../components/PublicHeader';
import Footer from '../components/Footer';

const IOS_REPOSITORY_URL = 'https://github.com/JiawenZhu/careervivid-ios';
const IOS_SCREENSHOT_BASE = 'https://raw.githubusercontent.com/JiawenZhu/careervivid-ios/main/docs/screenshots/ios';

const PRACTICE_QUESTIONS = [
  'Tell me about a time you disagreed with your tech lead.',
  'Walk me through a project you are genuinely proud of.',
  'Why do you want to work at this company?',
  'How would you design a rate limiter for a public API?',
];

const WAVEFORM_HEIGHTS = [10, 17, 25, 13, 30, 20, 34, 16, 28, 22];

const workflow = [
  {
    icon: Route,
    title: 'Pick your target company',
    copy: 'Choose the exact interview loop for the company you’re applying to — or build a custom path around the role you want next.',
  },
  {
    icon: Mic,
    title: 'Say your answer out loud',
    copy: 'Record like you’re in the room. Read the transcript, fix what you meant to say, then send it for scoring.',
  },
  {
    icon: BarChart3,
    title: 'See exactly what to fix',
    copy: 'Get scored on clarity, confidence, and relevance — and watch the numbers climb with every new attempt.',
  },
];

const screenShots = [
  {
    src: `${IOS_SCREENSHOT_BASE}/home-interview-activity.png`,
    alt: 'CareerVivid iOS interview activity dashboard',
    label: 'Your streak, front and center',
  },
  {
    src: `${IOS_SCREENSHOT_BASE}/personalized-challenge-recording.png`,
    alt: 'CareerVivid iOS personalized interview recording screen',
    label: 'Record answers in your own voice',
  },
  {
    src: `${IOS_SCREENSHOT_BASE}/personalized-report.png`,
    alt: 'CareerVivid iOS interview feedback report',
    label: 'Feedback you can act on tonight',
  },
];

const easeOutExpo = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

/** Animated number that counts up when scrolled into view. */
const CountUp: React.FC<{ value: number }> = ({ value }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node || !inView) return undefined;
    if (reduceMotion) {
      node.textContent = String(value);
      return undefined;
    }
    const controls = animate(0, value, {
      duration: 1.1,
      ease: 'easeOut',
      onUpdate: (latest) => {
        node.textContent = String(Math.round(latest));
      },
    });
    return () => controls.stop();
  }, [inView, value, reduceMotion]);

  return <span ref={ref}>0</span>;
};

/** Cycles through real interview questions inside the phone mock. */
const QuestionCycler: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % PRACTICE_QUESTIONS.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="mt-3 min-h-[4.5rem]">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="text-base font-extrabold leading-snug text-[#211b16]"
        >
          &ldquo;{PRACTICE_QUESTIONS[index]}&rdquo;
        </motion.p>
      </AnimatePresence>
    </div>
  );
};

/** Follows the cursor with a gentle 3D tilt; stays flat for reduced motion. */
const TiltCard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const reduceMotion = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [5, -5]), { stiffness: 150, damping: 18 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-5, 5]), { stiffness: 150, damping: 18 });

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    if (reduceMotion) return;
    const rect = event.currentTarget.getBoundingClientRect();
    x.set((event.clientX - rect.left) / rect.width - 0.5);
    y.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div style={{ perspective: 1200 }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <motion.div style={reduceMotion ? undefined : { rotateX, rotateY, transformStyle: 'preserve-3d' }}>
        {children}
      </motion.div>
    </div>
  );
};

const Waveform: React.FC = () => {
  const reduceMotion = useReducedMotion();
  return (
    <div className="mt-4 flex h-[34px] items-end gap-1" aria-hidden="true">
      {WAVEFORM_HEIGHTS.map((height, index) => (
        <motion.span
          key={index}
          className="w-1.5 rounded-full bg-[#4a4392]"
          style={{ height }}
          animate={reduceMotion ? undefined : { height: [height * 0.45, height, height * 0.6, height * 0.9, height * 0.45] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut', delay: index * 0.08 }}
        />
      ))}
    </div>
  );
};

const IOSAppLandingPage: React.FC = () => (
  <div className="cv-warm-page cv-warm-grid overflow-x-hidden">
    <Helmet>
      <title>CareerVivid for iOS | Practice the exact questions interviews ask</title>
      <meta
        name="description"
        content="CareerVivid for iOS gives you the exact questions companies ask, lets you answer them out loud, and shows you precisely what to fix before the real interview."
      />
      <link rel="canonical" href="https://careervivid.app/ios" />
    </Helmet>

    <PublicHeader variant="editorial" />

    <main className="pt-24 sm:pt-28">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8 lg:pb-28">
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.12 }}
        >
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.55, ease: easeOutExpo }}
            className="cv-warm-eyebrow inline-flex items-center gap-2"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-[#dfe2ff] bg-[#f3f2ff] text-[#4a4392]">
              <Mic className="h-4 w-4" aria-hidden="true" />
            </span>
            CareerVivid for iOS
          </motion.div>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.55, ease: easeOutExpo }}
            className="cv-warm-heading mt-5 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] sm:text-5xl"
          >
            Practice the exact questions your interview will ask.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.55, ease: easeOutExpo }}
            className="cv-warm-body mt-5 max-w-xl text-lg leading-8"
          >
            Pick the company you&rsquo;re interviewing with, answer their real questions out loud, and get feedback that shows you exactly what to say better — before it counts.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.55, ease: easeOutExpo }}
            className="mt-7 flex flex-col gap-3 sm:flex-row"
          >
            <a
              href={IOS_REPOSITORY_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4a4392] px-5 py-3 text-sm font-bold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#37316f] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#4a4392] focus:ring-offset-2"
            >
              See the app on GitHub <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="/interview-studio"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#dfe2ff] bg-[#eef0ff] px-5 py-3 text-sm font-bold text-[#4a4392] transition-all hover:-translate-y-0.5 hover:bg-[#e5e5ff] focus:outline-none focus:ring-2 focus:ring-[#4a4392] focus:ring-offset-2"
            >
              Practice on the web now
            </a>
          </motion.div>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.55, ease: easeOutExpo }}
            className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#665a4a] dark:text-[#aaa39a]"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
            100% native SwiftUI, built in public — watch every commit land.
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: easeOutExpo }}
          className="relative mx-auto w-full max-w-[560px] lg:mr-0"
        >
          <TiltCard>
            <div className="rounded-[2rem] border border-[#e4d3bc] bg-[#fffaf1]/90 p-3 shadow-[0_24px_70px_rgba(81,65,37,0.13)] sm:p-4">
              <div className="rounded-[1.5rem] border border-[#e6dac8] bg-[#f8f8fb] p-3 sm:p-4">
                <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3 text-xs font-bold text-[#665a4a]">
                  <span className="flex items-center gap-2 text-[#211b16]">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#2f9557] opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-[#2f9557]" />
                    </span>
                    Interview practice
                  </span>
                  <span className="rounded-full bg-[#f3f2ff] px-2.5 py-1 text-[#4a4392]">iOS</span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
                  <div className="rounded-2xl border border-[#e5e7eb] bg-white p-4 shadow-sm">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a97935]">They might ask</p>
                    <QuestionCycler />
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#eeeff8]">
                      <motion.div
                        className="h-full rounded-full bg-[#4a4392]"
                        initial={{ width: 0 }}
                        animate={{ width: '66%' }}
                        transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <p className="mt-2 text-xs font-semibold text-[#665a4a]">2 of 3 answers complete</p>
                  </div>
                  <div className="rounded-2xl border border-[#dfe2ff] bg-[#f3f2ff] p-4">
                    <div className="flex items-center gap-2 text-[#4a4392]">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white"><Mic className="h-4 w-4" /></span>
                      <span className="text-sm font-bold">Voice practice</span>
                    </div>
                    <p className="mt-4 text-sm font-bold leading-6 text-[#211b16]">Speak naturally — you get a transcript you can edit before it&rsquo;s scored.</p>
                    <Waveform />
                  </div>
                </div>
                <div className="mt-3 rounded-2xl border border-[#e5e7eb] bg-white p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-[#211b16]">Your last report</span>
                    <span className="rounded-full bg-[#eef9f2] px-2 py-1 text-xs font-bold text-[#15803d]">+12 points</span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                    {[
                      { score: 70, label: 'Clarity' },
                      { score: 75, label: 'Confidence' },
                      { score: 90, label: 'Relevance' },
                    ].map(({ score, label }) => (
                      <div key={label} className="rounded-xl bg-[#f8f8fb] p-2 text-[#4a4392]">
                        <CountUp value={score} />
                        <br />
                        <span className="font-semibold text-[#665a4a]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </TiltCard>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.9, ease: easeOutExpo }}
            className="absolute -bottom-5 -left-4 hidden rounded-2xl border border-[#bde1ca] bg-[#f5fff8] px-4 py-3 shadow-lg sm:block"
          >
            <div className="flex items-center gap-2 text-sm font-bold text-[#166534]"><CheckCircle2 className="h-4 w-4" /> Every attempt is saved</div>
            <p className="mt-1 text-xs font-semibold text-[#548060]">Pick up tomorrow exactly where you left off.</p>
          </motion.div>
        </motion.div>
      </section>

      <section className="border-y border-[#e4d3bc] bg-[#fffaf1]/80 py-16 dark:border-[#37332d] dark:bg-[#262522]/85">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            className="max-w-2xl"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.55, ease: easeOutExpo }}
          >
            <p className="cv-warm-eyebrow">How it works</p>
            <h2 className="cv-warm-heading mt-3 text-3xl font-extrabold tracking-[-0.03em]">Answer a real question. Get told what to fix. Repeat.</h2>
          </motion.div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {workflow.map(({ icon: Icon, title, copy }, index) => (
              <motion.article
                key={title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.5, delay: index * 0.12, ease: easeOutExpo }}
                whileHover={{ y: -6 }}
                className="cv-warm-card p-5"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#dfe2ff] bg-[#f3f2ff] text-[#4a4392]"><Icon className="h-4 w-4" /></span>
                  <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#a97935]">0{index + 1}</span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-[#211b16] dark:text-[#f4f1e9]">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-[#665a4a] dark:text-[#aaa39a]">{copy}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          className="max-w-2xl"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.55, ease: easeOutExpo }}
        >
          <p className="cv-warm-eyebrow">Straight from the app</p>
          <h2 className="cv-warm-heading mt-3 text-3xl font-extrabold tracking-[-0.03em]">Built for the ten minutes you actually have.</h2>
          <p className="cv-warm-body mt-4 text-base leading-7">No courses to finish, no setup to fight. Open the app, answer one real question, and walk away knowing what to do better tomorrow.</p>
        </motion.div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {screenShots.map((screen, index) => (
            <motion.figure
              key={screen.src}
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.55, delay: index * 0.12, ease: easeOutExpo }}
              whileHover={{ y: -8 }}
              className={`cv-warm-card group overflow-hidden ${index === 1 ? 'lg:-translate-y-5' : ''}`}
            >
              <div className="border-b border-[#e4d3bc] bg-[#fffdf8] px-4 py-3 text-sm font-bold text-[#211b16] dark:border-[#37332d] dark:bg-[#302e2a] dark:text-[#f4f1e9]">{screen.label}</div>
              <div className="overflow-hidden">
                <img
                  className="aspect-[9/16] w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                  src={screen.src}
                  alt={screen.alt}
                  loading="lazy"
                />
              </div>
            </motion.figure>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6, ease: easeOutExpo }}
          className="rounded-2xl border border-[#e4d3bc] bg-[#fffaf1]/90 p-7 text-center shadow-sm sm:p-10"
        >
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl border border-[#dfe2ff] bg-[#f3f2ff] text-[#4a4392]"><Sparkles className="h-5 w-5" /></span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-[-0.03em] text-[#211b16] dark:text-[#f4f1e9]">Know what they&rsquo;ll ask before you walk in.</h2>
          <p className="mx-auto mt-3 max-w-2xl text-base font-medium leading-7 text-[#665a4a] dark:text-[#aaa39a]">The app, its architecture, and every design decision are public on GitHub. Explore how it&rsquo;s built — or start practicing on the web today.</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={IOS_REPOSITORY_URL} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#4a4392] px-5 py-3 text-sm font-bold text-white transition-all hover:-translate-y-0.5 hover:bg-[#37316f] hover:shadow-lg"><Github className="h-4 w-4" /> View the iOS project</a>
            <a href="/interview-studio" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#e4d3bc] bg-white px-5 py-3 text-sm font-bold text-[#211b16] transition-all hover:-translate-y-0.5 hover:bg-[#f6ecd9] dark:border-[#37332d] dark:bg-[#302e2a] dark:text-[#f4f1e9]"><FileText className="h-4 w-4" /> Browse company questions</a>
          </div>
        </motion.div>
      </section>
    </main>
    <Footer />
  </div>
);

export default IOSAppLandingPage;
