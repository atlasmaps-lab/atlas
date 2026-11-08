# Atlas Social: what must be done before it opens to the public

Atlas Social (posts, photos and video pinned to places, events, messages, activity, and a marketplace) is built and runs **in one browser only**, with demo content. Before it becomes a shared service that the public can use, the UK rules below apply. This is a working checklist, not legal advice: have the risk assessments and the payment flow reviewed by a lawyer.

## 1. Online Safety Act 2023 (Ofcom)
Atlas Social would be a **user-to-user service**. There is no exemption for small services.
- [ ] **Illegal content risk assessment**, written down *before launch*, and redone whenever the service changes significantly ([Ofcom codes of practice](https://ofcom.org.uk/online-safety/illegal-and-harmful-content/codes-of-practice)). The highest risks for Atlas: grooming (location, events and messages together), fraud (the marketplace), and harassment.
- [ ] **Children's access assessment.** If children can use it, also a **children's risk assessment** and the Protection of Children Codes (in force since 25 July 2025).
- [ ] **Age assurance.** Self-declaration (what the demo does) is not enough wherever 18+ content or events are allowed. Use "highly effective age assurance" such as facial age estimation or digital ID, or keep the whole service child-safe.
- [ ] **Named senior person** accountable for online safety.
- [ ] **Moderation, reporting and complaints.** Reports and the moderation queue are built (the queue is for developers only for now). Still needed:
  - [ ] response targets
  - [ ] appeals
  - [ ] a published complaints procedure
- [ ] **Terms of service** saying what is allowed and how it is enforced.
- Fees apply only from £250m worldwide revenue. Categorisation (Category 1/2A/2B) starts at millions of UK users. Neither applies at launch.

## 2. Privacy: UK GDPR, the Data (Use and Access) Act 2025, and the ICO Children's Code
- [ ] **DPIA** (data protection impact assessment). It is effectively mandatory: location data at scale, possibly involving children.
- [ ] **Privacy notice; lawful basis.** Use consent for precise location; for "Where I am now", the browser already asks each time.
- [ ] **Children's Code standard 10 (geolocation)**, built in Atlas:
  - location is by area (about 1 km) by default
  - exact location is opt-in per post
  - under-18 accounts can't share exact location or be counted in activity
  - "Where I am now" asks every time
  - [ ] Add a visible "location on" indicator while location is in use.
- [ ] **Photos:** EXIF (GPS and camera data) is removed in the browser before saving (built). **Video:** file data is kept, so video posts are pinned by area only (built). The server should strip video metadata too (for example with ffmpeg).
- [ ] **Retention limits** for location history, messages and check-ins. Delete check-ins after 24 hours.
- [ ] **Home privacy zone:** nothing posted within 500 m of a person's home shows on the map (built).
- [ ] **Data rights:** "Download everything" and "Delete my profile and posts" are built. They need to run on the server too.

## 3. Defamation and hosting
- [ ] **Notice-and-takedown workflow:** E-Commerce Regulations 2002 reg. 19 (remove unlawful content quickly once notified), and the Defamation Act 2013 s.5 operator process (respond to complaints within 48 hours; see the [MoJ guidance](https://www.gov.uk/government/publications/defamation-act-2013-guidance-and-faqs-on-section-5-regulations)).

## 4. Activity ("how busy is it")
- [ ] Only **anonymous, opt-in check-ins**, aggregated to cells of about 500 m. A cell shows only when at least **10** check-ins were made there (built, k = 10). It never shows individuals, and never homes.
- If licensed footfall data is wanted instead (O2 Motion, BT Active Intelligence, Huq, the GLA High Street Data Service), it comes under a contract: check its terms for public display.

## 5. Marketplace (buying and selling between people)
- [ ] **Payments.** Atlas must never hold buyers' money. Doing so is a regulated payment service (Payment Services Regulations 2017; the FCA's commercial agent exclusion doesn't apply to a platform acting for both sides). For now payment happens off-platform (built). Later, use a regulated provider with seller accounts (Stripe Connect, Adyen for Platforms or Mangopay); they do identity checks and hold the funds.
- [ ] **DMCC Act 2024:**
  - private sellers and traders are marked (built)
  - traders give their business name and address (built)
  - the total price including delivery is always shown (built)
  - [ ] Publish a **review policy** and take reasonable steps against fake reviews ([CMA208](https://assets.publishing.service.gov.uk/media/67eeb64fe9c76fa33048c790/CMA208_-_Fake_reviews_guidance.pdf)).
- [ ] **HMRC digital platform reporting** ([guidance](https://www.gov.uk/guidance/reporting-rules-for-digital-platforms)):
  - register with HMRC
  - collect sellers' identity and tax details
  - report by 31 January each year, and give each seller a copy
  - Low-volume goods sellers (under 30 sales and under about £1,700) are excluded. Atlas counts each seller's sales and warns at the threshold (built).
- [ ] **Prohibited items:** a keyword filter blocks the following (built). Add moderation and recall checks.
  - weapons and knives
  - drugs and medicines
  - alcohol, tobacco and vapes
  - fireworks
  - live animals
  - tickets, gift cards and vouchers
  - **shares, crypto and investments** (FCA-regulated activity; must stay out)
  - counterfeit or stolen goods, IDs and personal data
- [ ] **Product safety:** the General Product Safety Regulations 2005. Watch for marketplace duties under the Product Regulation and Metrology Act 2025.
- [ ] **Fraud** is a priority illegal harm under the Online Safety Act: include it in the risk assessment, and show scam warnings (built in the listing card).

## 6. When these are done
Switch `views/social/store.js` to the Supabase back end (see `docs/social-backend.md`), turn on accounts with real age assurance, and open it gradually.
