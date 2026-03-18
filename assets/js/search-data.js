// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-blog",
          title: "blog",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/blog/";
          },
        },{id: "nav-repositories",
          title: "repositories",
          description: "A collection of my GitHub repositories.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/repositories/";
          },
        },{id: "post-functorial-neural-architectures-from-higher-inductive-types",
        
          title: "Functorial Neural Architectures from Higher Inductive Types",
        
        description: "How we prove that compositional generalization is equivalent to a structural property of the decoder — and build architectures that have it by construction.",
        section: "Posts",
        handler: () => {
          
            window.location.href = "/blog/2026/hott-neuro/";
          
        },
      },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-a-two-decade-breakthrough-academia-sinica-team-and-ntu-hospital-unveil-panmetai-to-combat-the-king-of-cancers",
          title: 'A Two-Decade Breakthrough: Academia Sinica Team and NTU Hospital Unveil “PanMETAI” to Combat...',
          description: "",
          section: "News",},{id: "news-functorial-neural-architectures-from-higher-inductive-types-explained-and-preprint",
          title: 'Functorial Neural Architectures from Higher Inductive Types — explained and preprint',
          description: "",
          section: "News",},{
        id: 'social-scholar',
        title: 'Google Scholar',
        section: 'Socials',
        handler: () => {
          window.open("https://scholar.google.com/citations?user=8CD9rAgAAAAJ", "_blank");
        },
      },{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
