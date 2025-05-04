
import React, { useState } from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { Calendar } from "@/components/ui/calendar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Clock } from "lucide-react";

// Mock schedule data - this would come from your backend
const scheduleData = {
  monday: [
    { id: 1, title: "Morning Milk", host: "MilkMaster", time: "08:00 - 10:00", description: "Wake up with the freshest takes on the internet drama" },
    { id: 2, title: "Cow Talk", host: "FarmHands", time: "12:00 - 14:00", description: "Midday discussions with special guests" },
    { id: 3, title: "Evening Pasture", host: "GrazingGrace", time: "19:00 - 21:00", description: "Wind down with chill conversations and community call-ins" },
  ],
  tuesday: [
    { id: 4, title: "Milk Market", host: "DairyDan", time: "10:00 - 12:00", description: "Market trends and analysis of the most dramatic events" },
    { id: 5, title: "Barn Burner", host: "HaymakerHank", time: "15:00 - 17:00", description: "Hot takes and heated debates on today's controversies" },
    { id: 6, title: "Night Grazing", host: "MoonlightMoo", time: "20:00 - 22:00", description: "Late night laughs and laid back discussions" },
  ],
  wednesday: [
    { id: 7, title: "Udder Nonsense", host: "ComicCow", time: "09:00 - 11:00", description: "Comedy and light-hearted takes on internet drama" },
    { id: 8, title: "Pasture Politics", host: "FieldFiona", time: "14:00 - 16:00", description: "Analyzing the political landscape of online communities" },
    { id: 9, title: "Midnight Moos", host: "InsomniIan", time: "22:00 - 00:00", description: "Late night call-ins and casual conversations" },
  ],
  thursday: [
    { id: 10, title: "Dairy Diaries", host: "StorytellerSteve", time: "11:00 - 13:00", description: "Personal stories and experiences from the community" },
    { id: 11, title: "Grazing Grounds", host: "FieldForager", time: "16:00 - 18:00", description: "Exploring different online communities and subcultures" },
    { id: 12, title: "The Late Herd", host: "NightOwlNate", time: "21:00 - 23:00", description: "Late night discussions on the day's most interesting topics" },
  ],
  friday: [
    { id: 13, title: "Fresh Fields Friday", host: "WeekendWilly", time: "10:00 - 12:00", description: "Start your weekend with positive vibes and fun discussions" },
    { id: 14, title: "Haystack Hangout", host: "PartyPat", time: "17:00 - 19:00", description: "Pre-weekend celebrations and community events" },
    { id: 15, title: "Moonlight Meadow", host: "EveningEva", time: "20:00 - 22:00", description: "Wind down the work week with relaxing conversations" },
  ],
  saturday: [
    { id: 16, title: "Weekend Grazing", host: "SaturdaySam", time: "12:00 - 14:00", description: "Casual weekend discussions and community games" },
    { id: 17, title: "Pasture Party", host: "CelebrationCeleste", time: "18:00 - 20:00", description: "Weekend fun with games, prizes, and special guests" },
    { id: 18, title: "Starlight Stories", host: "MidnightMary", time: "22:00 - 00:00", description: "Share your stories under the stars with the community" },
  ],
  sunday: [
    { id: 19, title: "Sunday Serenity", host: "PeacefulPaul", time: "11:00 - 13:00", description: "Relaxed conversations to ease into your Sunday" },
    { id: 20, title: "Weekly Roundup", host: "SummarySteve", time: "15:00 - 17:00", description: "Recap the week's biggest moments and drama" },
    { id: 21, title: "New Week Preview", host: "FutureFiona", time: "19:00 - 21:00", description: "Look ahead to the upcoming week's expected events and drama" },
  ],
};

// Convert string day to title case
const formatDayTitle = (day: string): string => {
  return day.charAt(0).toUpperCase() + day.slice(1);
};

const Schedule: React.FC = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [currentDay, setCurrentDay] = useState<string>("monday");
  
  // Get the day name from a date object
  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
  };
  
  // Update current day when date changes
  const handleDateChange = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setCurrentDay(getDayName(selectedDate));
    }
  };

  // Handle tab selection
  const handleTabChange = (value: string) => {
    setCurrentDay(value);
    // Optional: update calendar to match selected day
    if (date) {
      const currentDate = new Date(date);
      const daysOfWeek = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
      const targetDayIndex = daysOfWeek.indexOf(value);
      const currentDayIndex = currentDate.getDay();
      const difference = targetDayIndex - currentDayIndex;
      
      const newDate = new Date(currentDate);
      newDate.setDate(currentDate.getDate() + difference);
      setDate(newDate);
    }
  };

  // Get current shows based on selected day
  const currentShows = scheduleData[currentDay as keyof typeof scheduleData] || [];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-8">
        <h1 className="text-3xl font-fredoka text-center mb-8">
          <span className="text-lolcow-blue">LOL</span>
          <span className="text-lolcow-red">COW</span>
          <span className="text-white">.CO</span>
          <span className="text-white"> Schedule</span>
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="bg-lolcow-black border border-lolcow-lightgray col-span-1">
            <CardHeader>
              <CardTitle className="font-fredoka text-white flex items-center">
                <CalendarIcon className="mr-2 h-5 w-5 text-lolcow-blue" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar 
                mode="single"
                selected={date}
                onSelect={handleDateChange}
                className="rounded-md border border-lolcow-lightgray text-white"
              />
            </CardContent>
          </Card>
          
          <Card className="bg-lolcow-black border border-lolcow-lightgray col-span-1 lg:col-span-2">
            <CardHeader>
              <CardTitle className="font-fredoka text-white">
                Shows for {date?.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={currentDay} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid grid-cols-7 mb-4 bg-lolcow-lightgray">
                  {Object.keys(scheduleData).map(day => (
                    <TabsTrigger 
                      key={day}
                      value={day}
                      className="text-xs md:text-sm"
                    >
                      {formatDayTitle(day).slice(0, 3)}
                    </TabsTrigger>
                  ))}
                </TabsList>
                
                {Object.keys(scheduleData).map(day => (
                  <TabsContent key={day} value={day} className="space-y-4">
                    {scheduleData[day as keyof typeof scheduleData].map(show => (
                      <div 
                        key={show.id} 
                        className="p-4 border border-lolcow-lightgray rounded-lg hover:bg-lolcow-lightgray/20 transition-all"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-2">
                          <h3 className="text-xl font-medium text-lolcow-blue">{show.title}</h3>
                          <div className="flex items-center text-gray-300 mt-1 md:mt-0">
                            <Clock className="h-4 w-4 mr-1 text-lolcow-red" />
                            <span>{show.time}</span>
                          </div>
                        </div>
                        <p className="text-gray-400 mb-2">Hosted by: {show.host}</p>
                        <p className="text-gray-300">{show.description}</p>
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Schedule;
