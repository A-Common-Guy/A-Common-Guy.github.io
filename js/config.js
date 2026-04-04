/**
 * ============================================
 * PERSONAL CONFIGURATION
 * ============================================
 * Edit this file to update all your personal info across the site.
 * Changes here will automatically reflect on all pages.
 */

const CONFIG = {
    // ========== PERSONAL INFO ==========
    name: {
        first: "Giuseppe",
        last: "Festa",
        full: "Giuseppe Festa"
    },

    title: "Control & AI Engineer for Humanoid Robots",

    // Tagline shown in hero section
    tagline: "Building the future of <span class=\"highlight\">humanoid robotics</span> — from embedded control to AI-driven locomotion. Always seeking an opportunity to change the world.",

    // ========== CONTACT & SOCIAL ==========
    email: "giuseppefesta@protonmail.com",

    social: {
        github: "https://github.com/A-Common-Guy",
        linkedin: "https://www.linkedin.com/in/giuseppe-festa-3a0531174/",
    },

    // ========== DOCUMENTS ==========
    cv: "documents/Giuseppe_Festa_Curriculum_Vitae.pdf",

    // ========== TYPING ANIMATION ==========
    typingPhrases: [
        "Control & AI Engineer",
        "Humanoid Robotics Developer",
        "Embedded Systems Team Lead",
        "Computer Vision Engineer",
        "Startup Co-Founder & CTO",
    ],

    // ========== ABOUT SECTION ==========
    about: {
        intro: `Control Engineer with a passion for innovation and sustainability. Currently <span class="highlight">Embedded Control Engineer Team Lead at Neura Robotics</span> (Zurich), building RT systems and state estimation for humanoid robots.`,

        mission: `I've co-invented patented technology, co-founded startups, and shipped real products at Michelin, Terna, and Neura Robotics — with a consistent 4.0 GPA and both BSc and MSc with honours from Politecnico di Milano.`,

        focus: `Currently focused on RT embedded control, DDS-based robotic interfaces, and humanoid locomotion. Alumni of the prestigious Alta Scuola Politecnica honour program (PoliMi & PoliTo). Multilingual: Italian, English (C2), Spanish (B2), German (A2).`
    },

    // ========== STATISTICS ==========
    stats: {
        yearsExperience: 5,
        projectsCompleted: 8,
        hoursOfCoding: 5000
    },

    // ========== PROFILE ==========
    profileImage: "assets/images/profile.jpg",
    profileId: "CTRL_AI_ENG_001",
};

// Make config available globally
window.CONFIG = CONFIG;
