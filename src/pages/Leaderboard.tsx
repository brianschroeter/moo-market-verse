import React from "react";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import SmoothScroll from "@/components/SmoothScroll";
import { Card, CardContent } from "@/components/ui/card";

const Leaderboard: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <SmoothScroll>
        <div className="flex flex-col min-h-screen bg-gradient-to-b from-lolcow-black to-lolcow-darkgray text-white">
          <Navbar />
          
          <main className="flex-grow container mx-auto px-4 py-8 flex items-center justify-center">
            <Card className="bg-lolcow-black border border-lolcow-lightgray max-w-2xl w-full">
              <CardContent className="py-20 text-center">
                <h1 className="text-4xl md:text-6xl font-fredoka text-white mb-6">
                  OFFLINE
                </h1>
                <p className="text-lg md:text-xl text-gray-400">
                  The leaderboard is temporarily unavailable
                </p>
              </CardContent>
            </Card>
          </main>
          
          <Footer />
        </div>
      </SmoothScroll>
    </div>
  );
};

export default Leaderboard;