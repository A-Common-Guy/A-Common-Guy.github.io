# Giuseppe Festa - Robotics Engineer Portfolio

🤖 A futuristic portfolio website showcasing robotics engineering projects and expertise.

## 🌐 Live Site

Visit: [https://a-common-guy.github.io](https://a-common-guy.github.io)

## 🚀 Features

- **Futuristic Design**: Cyberpunk-inspired aesthetic with electric cyan accents
- **Interactive Timeline**: Showcase career milestones and project history
- **Project Showcase**: Detailed project pages with galleries, videos, and documentation
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Smooth Animations**: Scroll-triggered animations and interactive elements
- **Skills Visualization**: Animated skill bars and categorized expertise

## 📁 Project Structure

```
├── index.html              # Main portfolio page
├── css/
│   ├── style.css          # Main stylesheet
│   └── project.css        # Project page styles
├── js/
│   └── main.js            # JavaScript for animations
├── projects/
│   └── project-template.html  # Template for new projects
├── assets/
│   └── images/
│       ├── profile.jpg    # Your profile photo (add this)
│       └── projects/      # Project images
├── documents/
│   └── Giuseppe_Festa_Curriculum_Vitae.pdf
└── _config.yml            # GitHub Pages config
```

## 🔧 Customization

### Adding Your Profile Photo
1. Add your photo to `assets/images/profile.jpg`
2. Recommended size: 600x720 pixels or similar aspect ratio

### Updating Personal Information
1. Edit `index.html` and update:
   - Email address in the Contact section
   - LinkedIn and GitHub URLs
   - About section text
   - Timeline events

### Adding a New Project

1. **Copy the template**: Duplicate `projects/project-template.html`
2. **Rename it**: Use a descriptive name like `humanoid-robot-arm.html`
3. **Add project images**: Create a folder in `assets/images/projects/your-project-name/`
4. **Update content**: Fill in all sections with your project details
5. **Add to main page**: Update the projects grid in `index.html`

### Adding Timeline Events

In `index.html`, add a new timeline event following this template:

```html
<div class="timeline-event" data-date="YEAR">
    <div class="event-dot">
        <div class="dot-pulse"></div>
    </div>
    <div class="event-content">
        <div class="event-date">
            <span class="date-year">YEAR</span>
            <span class="date-month">MONTH</span>
        </div>
        <div class="event-card">
            <h3 class="event-title">Title</h3>
            <p class="event-company">Company/Institution</p>
            <p class="event-description">Description</p>
            <div class="event-tags">
                <span class="tag">Tag1</span>
                <span class="tag">Tag2</span>
            </div>
        </div>
    </div>
</div>
```

### Updating Skills

Edit the skill bars in the Skills section of `index.html`. Change the `data-progress` attribute to adjust skill levels (0-100).

## 🎨 Design Customization

Colors can be modified in `css/style.css` by changing the CSS custom properties:

```css
:root {
    --color-primary: #00f0ff;      /* Main accent color */
    --color-secondary: #ff00a0;    /* Secondary accent */
    --color-accent: #00ff88;       /* Tertiary accent */
    --bg-dark: #0a0a0f;            /* Dark background */
    /* ... other variables */
}
```

## 📱 Responsive Breakpoints

- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

## 🛠️ Technologies Used

- HTML5
- CSS3 (with Custom Properties)
- Vanilla JavaScript
- Google Fonts (Orbitron, Rajdhani, JetBrains Mono)

## 📄 License

This portfolio template is free to use for personal purposes.

---

Built with ⚡ by Giuseppe Festa
