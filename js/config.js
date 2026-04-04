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
    
    title: "Robotics Engineer",
    
    // Tagline shown in hero section
    tagline: "Engineering the future of humanoid robotics. Transforming science fiction into science fact, one servo at a time.",
    
    // ========== CONTACT & SOCIAL ==========
    email: "your.email@example.com",
    
    social: {
        github: "https://github.com/A-Common-Guy",
        linkedin: "https://www.linkedin.com/in/giuseppe-festa-3a0531174/",
        // Add more social links as needed:
        // twitter: "https://twitter.com/yourhandle",
        // youtube: "https://youtube.com/@yourchannel",
    },
    
    // ========== DOCUMENTS ==========
    cv: "documents/Giuseppe_Festa_Curriculum_Vitae.pdf",
    
    // ========== TYPING ANIMATION ==========
    // Phrases that rotate in the hero section
    typingPhrases: [
        "Robotics Engineer",
        "Humanoid Systems Developer",
        "Control Systems Expert",
        "AI & Motion Planner",
        "Innovation Enthusiast"
    ],
    
    // ========== ABOUT SECTION ==========
    about: {
        intro: `Hello! I'm a passionate <span class="highlight">Robotics Engineer</span> 
                dedicated to pushing the boundaries of what's possible in humanoid robotics 
                and autonomous systems.`,
        
        mission: `My mission is to bridge the gap between human capabilities and robotic 
                  potential, creating machines that can work alongside us, assist us, and 
                  help us explore new frontiers.`,
        
        focus: `Currently focused on humanoid locomotion, manipulation systems, and 
                integrating advanced AI with mechanical precision. Always learning, 
                always building, always innovating.`
    },
    
    // ========== STATISTICS ==========
    // Update these numbers to reflect your experience
    stats: {
        yearsExperience: 5,
        projectsCompleted: 10,
        hoursOfCoding: 1000
    },
    
    // ========== PROFILE ==========
    profileImage: "assets/images/profile.jpg",
    profileId: "ROBOTICS_ENG_001", // Fun ID shown on profile frame
};

// Make config available globally
window.CONFIG = CONFIG;

