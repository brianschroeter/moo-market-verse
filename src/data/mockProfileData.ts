
export const mockUser = {
  id: "123456789",
  username: "CowFan123",
  email: "cowfan@example.com",
  avatar: "https://cdn.discordapp.com/avatars/123456789/abcdef.png",
  connections: [
    { platform: "Twitter", username: "@cowfan123" },
    { platform: "Instagram", username: "cowfan123" }
  ],
  joined: "Jan 15, 2023",
  youtubeAccounts: [
    { 
      id: "yt1", 
      channelName: "CowFan Gaming", 
      avatar: "https://via.placeholder.com/50", 
      isConnected: true 
    }
  ],
  memberships: [
    {
      channelId: "ch1",
      channelName: "LolCow Main Channel",
      role: "crown" as const,
      icon: "fa-solid fa-crown text-yellow-400"
    },
    {
      channelId: "ch2",
      channelName: "LolCow Side Channel",
      role: "pay pig" as const,
      icon: "fa-solid fa-piggy-bank text-purple-400"
    },
    {
      channelId: "ch3",
      channelName: "LolCow Archives",
      role: "ban world" as const,
      icon: "fa-solid fa-ban text-red-500"
    }
  ]
};

export const mockAnnouncements = [
  {
    id: "a1",
    title: "New Discord Server Rules",
    content: "We've updated our Discord server rules. Please review them before participating in discussions.",
    date: "May 1, 2025",
    isImportant: true
  },
  {
    id: "a2",
    title: "Upcoming Live Stream",
    content: "Join us this Friday at 8PM EST for a special live stream event!",
    date: "Apr 30, 2025"
  }
];

export const mockProducts = [
  {
    id: "p1",
    name: "LolCow T-Shirt",
    description: "Limited edition LolCow mascot t-shirt. Available in multiple sizes.",
    imageUrl: "https://via.placeholder.com/300x200",
    url: "#"
  },
  {
    id: "p2",
    name: "LolCow Mug",
    description: "Start your day with the official LolCow coffee mug.",
    imageUrl: "https://via.placeholder.com/300x200",
    url: "#"
  }
];
