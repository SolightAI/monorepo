/**
 * ControlPanel.js
 * 
 * A component that provides controls for adjusting the simulation parameters.
 * Features:
 * - Simulation mode selection (Standard, Focused, Chaos)
 * - User count adjustment
 * - Speed control
 * - A/B testing toggle with variant configuration
 * - Behavior variance slider
 * - Pause/Resume control
 */

import React, { useState } from 'react';
import { Settings, Users, Play, Pause, BarChart, Layout, RefreshCw, SplitSquareVertical } from 'lucide-react';
import { SIMULATION_MODES } from './constants';

const Tooltip = ({ children, content }) => (
  <div className="group relative">
    {children}
    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs
      bg-black text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
      {content}
    </div>
  </div>
);

const ControlPanel = ({
  settings,
  onSettingsChange,
  isABTestingEnabled,
  onToggleABTesting,
  isPaused,
  onTogglePause,
  simulationMode,
  onModeChange
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [abTestingConfig, setAbTestingConfig] = useState({
    variantA: { conversionBoost: 0, speedMultiplier: 1 },
    variantB: { conversionBoost: 0.1, speedMultiplier: 1.2 }
  });

  const handleAbConfigChange = (variant, field, value) => {
    setAbTestingConfig(prev => ({
      ...prev,
      [variant]: {
        ...prev[variant],
        [field]: parseFloat(value)
      }
    }));
  };

  return (
    <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4 z-10">
      <div className="flex flex-col space-y-4">
        {/* Main Controls Row */}
        <div className="flex items-center justify-between">
          {/* Mode Selection */}
          <div className="flex space-x-2">
            {Object.entries(SIMULATION_MODES).map(([mode, config]) => (
              <Tooltip key={mode} content={config.description}>
                <button
                  onClick={() => onModeChange(config)}
                  className={`px-3 py-1.5 rounded-lg text-sm flex items-center space-x-1.5
                    transition-colors ${
                    simulationMode.name === config.name
                      ? 'bg-laneo-500 text-white'
                      : 'bg-white/10 hover:bg-white/20 text-gray-300'
                  }`}
                >
                  {mode === 'STANDARD' && <Layout className="w-4 h-4" />}
                  {mode === 'FOCUSED' && <Users className="w-4 h-4" />}
                  {mode === 'CHAOS' && <BarChart className="w-4 h-4" />}
                  <span>{config.name}</span>
                </button>
              </Tooltip>
            ))}
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-6">
            {/* User Count */}
            <Tooltip content="Number of simulated users">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={settings.userCount}
                  onChange={(e) => onSettingsChange({ userCount: parseInt(e.target.value) })}
                  className="w-16 px-2 py-1 rounded bg-white/10 border border-white/20 text-white"
                />
              </div>
            </Tooltip>

            {/* Speed Control */}
            <Tooltip content="Simulation speed multiplier">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={settings.speedMultiplier}
                  onChange={(e) => onSettingsChange({ speedMultiplier: parseFloat(e.target.value) })}
                  className="w-24 accent-laneo-500"
                />
                <span className="text-sm text-gray-400">{settings.speedMultiplier}x</span>
              </div>
            </Tooltip>

            {/* Behavior Variance */}
            <Tooltip content="Randomness in user behavior">
              <div className="flex items-center space-x-2">
                <BarChart className="w-4 h-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.behaviorVariance}
                  onChange={(e) => onSettingsChange({ behaviorVariance: parseFloat(e.target.value) })}
                  className="w-24 accent-laneo-500"
                />
                <span className="text-sm text-gray-400">{Math.round(settings.behaviorVariance * 100)}%</span>
              </div>
            </Tooltip>

            {/* A/B Testing Toggle */}
            <Tooltip content="Toggle A/B testing simulation">
              <button
                onClick={onToggleABTesting}
                className={`p-2 rounded-lg transition-colors flex items-center space-x-2 ${
                  isABTestingEnabled
                    ? 'bg-laneo-500 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                }`}
              >
                <SplitSquareVertical className="w-4 h-4" />
                <span className="text-sm">A/B Test</span>
              </button>
            </Tooltip>

            {/* Pause/Resume */}
            <Tooltip content={isPaused ? 'Resume simulation' : 'Pause simulation'}>
              <button
                onClick={onTogglePause}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
              </button>
            </Tooltip>

            {/* Settings */}
            <Tooltip content="Advanced settings">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className={`p-2 rounded-lg transition-colors ${
                  showSettings
                    ? 'bg-laneo-500 text-white'
                    : 'bg-white/10 hover:bg-white/20 text-gray-300'
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* A/B Testing Configuration */}
        {isABTestingEnabled && (
          <div className="bg-white/5 rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">A/B Testing Configuration</h3>
            <div className="grid grid-cols-2 gap-8">
              {['variantA', 'variantB'].map((variant) => (
                <div key={variant} className="space-y-4">
                  <h4 className="text-sm font-medium text-gray-400">
                    Variant {variant === 'variantA' ? 'A' : 'B'}
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-400">Conversion Boost</label>
                      <input
                        type="number"
                        min="-0.5"
                        max="0.5"
                        step="0.1"
                        value={abTestingConfig[variant].conversionBoost}
                        onChange={(e) => handleAbConfigChange(variant, 'conversionBoost', e.target.value)}
                        className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm text-gray-400">Speed Multiplier</label>
                      <input
                        type="number"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={abTestingConfig[variant].speedMultiplier}
                        onChange={(e) => handleAbConfigChange(variant, 'speedMultiplier', e.target.value)}
                        className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advanced Settings Panel */}
        {showSettings && (
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-300 mb-4">Advanced Settings</h3>
            <div className="grid grid-cols-2 gap-8">
              {/* Mode-specific parameters */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-400">
                  {simulationMode.name} Mode Parameters
                </h4>
                <div className="space-y-2">
                  {Object.entries(simulationMode.params).map(([param, value]) => (
                    <div key={param} className="flex items-center justify-between">
                      <label className="text-sm text-gray-400">
                        {param.replace(/([A-Z])/g, ' $1').toLowerCase()}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="1"
                        step="0.1"
                        value={value}
                        onChange={(e) => {
                          const newParams = {
                            ...simulationMode.params,
                            [param]: parseFloat(e.target.value)
                          };
                          onModeChange({ ...simulationMode, params: newParams });
                        }}
                        className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Settings */}
              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-400">Performance Settings</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-400">Path Length</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      step="10"
                      value={settings.maxPathLength || 30}
                      onChange={(e) => onSettingsChange({ maxPathLength: parseInt(e.target.value) })}
                      className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-sm text-gray-400">Update Interval (ms)</label>
                    <input
                      type="number"
                      min="16"
                      max="100"
                      step="16"
                      value={settings.updateInterval || 16}
                      onChange={(e) => onSettingsChange({ updateInterval: parseInt(e.target.value) })}
                      className="w-20 px-2 py-1 rounded bg-white/10 border border-white/20 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlPanel; 