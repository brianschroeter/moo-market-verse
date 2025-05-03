
import React from "react";
import { Link } from "react-router-dom";

const cowCategories = [
  {
    id: "lolcow-live",
    name: "LolCow Live",
    description: "The original cool cow with 3D glasses",
    color: "from-lolcow-blue to-lolcow-red",
  },
  {
    id: "queens",
    name: "Queens",
    description: "Fabulous cows with style and sass",
    color: "from-pink-500 to-purple-500",
  },
  {
    id: "lolcow-r",
    name: "LolCow R",
    description: "The premium version with extra features",
    color: "from-lolcow-red to-orange-500",
  },
  {
    id: "mafia-milkers",
    name: "MafiaMilkers",
    description: "The tough guys of the cow universe",
    color: "from-gray-600 to-gray-900",
  },
  {
    id: "cafe",
    name: "Café",
    description: "Sophisticated cows for the coffee lovers",
    color: "from-amber-700 to-yellow-600",
  },
  {
    id: "madhouse",
    name: "Madhouse",
    description: "The crazy and zany cows of the bunch",
    color: "from-green-400 to-purple-500",
  },
];

const CowCategories: React.FC = () => {
  return (
    <div className="py-16 bg-lolcow-darkgray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-fredoka text-white mb-8 text-center">
          Meet The Cows
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {cowCategories.map((category) => (
            <Link 
              key={category.id} 
              to={`/cows/${category.id}`}
              className="relative overflow-hidden rounded-xl group"
            >
              <div className={`h-40 bg-gradient-to-br ${category.color} p-6 transition-all duration-300 group-hover:scale-105`}>
                <h3 className="text-xl font-fredoka text-white">{category.name}</h3>
                <p className="text-white/70 text-sm mt-2">{category.description}</p>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="mt-10 text-center">
          <Link to="/cows" className="btn-primary">
            View All Cows
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CowCategories;
