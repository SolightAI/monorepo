import React, { useState, useMemo } from 'react';
import { Loader, AlertCircle, ChevronDown, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import useInProgressGenerations from '@/hooks/useInProgressGenerations';
import { 
  GENERATION_TYPES, 
  LOADING_MESSAGES, 
  UI 
} from '@/constants/generations';

const InProgressGenerations = ({ onComplete }) => {
  const [showGenerations, setShowGenerations] = useState(false);
  const { generations, loading, error } = useInProgressGenerations(onComplete, showGenerations);
  const [expandedItems, setExpandedItems] = useState(new Set());

  const toggleItem = (id) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Memoize the grouped generations logic
  const groupedGenerations = useMemo(() => {
    return generations.reduce((acc, generation) => {
      if (!acc[generation.product_name]) {
        acc[generation.product_name] = {
          product: generation.product_name,
          epics: [],
          features: [],
          userStories: []
        };
      }

      switch (generation.type) {
        case GENERATION_TYPES.EPIC:
        case GENERATION_TYPES.EPIC_ALL:
          acc[generation.product_name].epics.push(generation);
          break;
        case GENERATION_TYPES.FEATURE:
        case GENERATION_TYPES.FEATURE_ALL:
          acc[generation.product_name].features.push(generation);
          break;
        case GENERATION_TYPES.USER_STORY:
        case GENERATION_TYPES.USER_STORY_ALL:
          acc[generation.product_name].userStories.push(generation);
          break;
      }

      return acc;
    }, {});
  }, [generations]);

  // Memoize the generation details function
  const getGenerationDetails = useMemo(() => (generation) => {
    switch (generation.type) {
      case GENERATION_TYPES.EPIC_ALL:
        return `${generation.details} ${generation.product_name}`;
      case GENERATION_TYPES.FEATURE:
      case GENERATION_TYPES.FEATURE_ALL:
        return `${generation.details} ${generation.epic_name}`;
      case GENERATION_TYPES.USER_STORY:
      case GENERATION_TYPES.USER_STORY_ALL:
        return `${generation.details} ${generation.feature_name}`;
      default:
        return generation.details;
    }
  }, []);

  if (loading) {
    return (
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center text-blue-600">
          <Loader size={20} className="animate-spin mr-2" />
          <span>{LOADING_MESSAGES.CHECKING}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 p-4 bg-red-50 rounded-lg">
        <div className="flex items-center text-red-600">
          <AlertCircle size={20} className="mr-2" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (generations.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      {/* Toggle Button */}
      <button
        onClick={() => setShowGenerations(!showGenerations)}
        className="flex items-center text-gray-600 hover:text-blue-600 transition-colors mb-3 px-4 py-2 rounded-lg border border-gray-200 hover:border-blue-200 hover:bg-blue-50"
      >
        {showGenerations ? (
          <ToggleRight size={24} className="mr-3 text-blue-600" />
        ) : (
          <ToggleLeft size={24} className="mr-3" />
        )}
        <span className="font-medium text-base">
          {showGenerations ? UI.TOGGLE_BUTTON.HIDE : UI.TOGGLE_BUTTON.SHOW}
        </span>
      </button>

      {/* Generations Content */}
      {showGenerations && (
        <div className="space-y-2">
          {Object.values(groupedGenerations).map((group) => (
            <div key={group.product} className="border rounded-lg overflow-hidden">
              {/* Product Header */}
              <button
                onClick={() => toggleItem(`product-${group.product}`)}
                className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
              >
                <div className="flex items-center">
                  <Loader size={20} className="animate-spin mr-3 text-blue-600" />
                  <span className="font-medium text-gray-900">{group.product}</span>
                </div>
                {expandedItems.has(`product-${group.product}`) ? (
                  <ChevronDown size={20} className="text-gray-500" />
                ) : (
                  <ChevronRight size={20} className="text-gray-500" />
                )}
              </button>

              {/* Expanded Content */}
              {expandedItems.has(`product-${group.product}`) && (
                <div className="p-4 space-y-4">
                  {/* Epics Section */}
                  {group.epics.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleItem(`epics-${group.product}`)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      >
                        <span className="font-medium text-gray-700">{UI.SECTIONS.EPICS}</span>
                        {expandedItems.has(`epics-${group.product}`) ? (
                          <ChevronDown size={16} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-500" />
                        )}
                      </button>
                      {expandedItems.has(`epics-${group.product}`) && (
                        <div className="ml-4 mt-2 space-y-2">
                          {group.epics.map((generation) => (
                            <div key={generation.id} className="flex items-center text-sm text-gray-600">
                              <Loader size={16} className="animate-spin mr-2 text-blue-600" />
                              <span>{getGenerationDetails(generation)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Features Section */}
                  {group.features.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleItem(`features-${group.product}`)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      >
                        <span className="font-medium text-gray-700">{UI.SECTIONS.FEATURES}</span>
                        {expandedItems.has(`features-${group.product}`) ? (
                          <ChevronDown size={16} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-500" />
                        )}
                      </button>
                      {expandedItems.has(`features-${group.product}`) && (
                        <div className="ml-4 mt-2 space-y-2">
                          {group.features.map((generation) => (
                            <div key={generation.id} className="flex items-center text-sm text-gray-600">
                              <Loader size={16} className="animate-spin mr-2 text-blue-600" />
                              <span>{getGenerationDetails(generation)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* User Stories Section */}
                  {group.userStories.length > 0 && (
                    <div>
                      <button
                        onClick={() => toggleItem(`userStories-${group.product}`)}
                        className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      >
                        <span className="font-medium text-gray-700">{UI.SECTIONS.USER_STORIES}</span>
                        {expandedItems.has(`userStories-${group.product}`) ? (
                          <ChevronDown size={16} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-500" />
                        )}
                      </button>
                      {expandedItems.has(`userStories-${group.product}`) && (
                        <div className="ml-4 mt-2 space-y-2">
                          {group.userStories.map((generation) => (
                            <div key={generation.id} className="flex items-center text-sm text-gray-600">
                              <Loader size={16} className="animate-spin mr-2 text-blue-600" />
                              <span>{getGenerationDetails(generation)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InProgressGenerations; 