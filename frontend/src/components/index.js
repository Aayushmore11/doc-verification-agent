/**
 * src/components/index.js — Barrel file
 *
 * Single import path for all shared UI components and sections.
 * Add a new export here every time you create a component.
 */

/* ── Page sections ───────────────────────────────────────────────────────── */
export { default as Navbar              } from './Navbar/Navbar'
export { default as HeroSection         } from './HeroSection/HeroSection'
export { default as TrustBar            } from './TrustBar/TrustBar'
export { default as FeaturesGrid        } from './FeaturesGrid/FeaturesGrid'
export { default as HowItWorks          } from './HowItWorks/HowItWorks'
export { default as VerificationDemo    } from './VerificationDemo/VerificationDemo'
export { default as ComplianceSection   } from './ComplianceSection/ComplianceSection'
export { default as Footer              } from './Footer/Footer'

/* ── Reusable primitives ─────────────────────────────────────────────────── */
export { default as UploadBox           } from './UploadBox/UploadBox'
export { default as UploadProgress      } from './UploadProgress/UploadProgress'
export { default as VerificationLoader  } from './VerificationLoader/VerificationLoader'
export { default as VerificationResult  } from './VerificationResult/VerificationResult'
