import React from 'react';
import { UserSettings, RuntimeState, TpType } from '../types';
import Switch from './Switch';

interface ControlPanelProps {
  settings: UserSettings;
  runtime: RuntimeState | null; // Null if not yet connected
  onSettingsChange: (newSettings: UserSettings) => void;
  onSettingsSave: (settingsOverride?: UserSettings) => void;
  onControlToggle: (type: 'buy' | 'sell' | 'cyclic', value: boolean) => void;
  onEmergencyClose: () => void;
  connected: boolean;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  settings, 
  runtime, 
  onSettingsChange,
  onSettingsSave,
  onControlToggle,
  onEmergencyClose,
  connected
}) => {
  
  const updateField = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    const newSettings = { ...settings, [key]: value };
    onSettingsChange(newSettings);
    // For text inputs, we save onBlur. For changes here we just update state.
  };

  // Helper for immediate update + save (for Radios)
  const setAndSave = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      onSettingsChange(newSettings);
      onSettingsSave(newSettings);
  };

  const isBuyOn = runtime?.buy_on ?? false;
  const isSellOn = runtime?.sell_on ?? false;
  const isCyclicOn = runtime?.cyclic_on ?? false;

  // v3.2.4 Closing Phase Logic
  const isBuyClosing = runtime?.buy_is_closing ?? false;
  const isSellClosing = runtime?.sell_is_closing ?? false;

  const renderTpOptions = (side: 'buy' | 'sell') => {
      const typeKey = side === 'buy' ? 'buy_tp_type' : 'sell_tp_type';
      const valKey = side === 'buy' ? 'buy_tp_value' : 'sell_tp_value';
      const currentType = settings[typeKey];
      const color = side === 'buy' ? 'text-green-500 focus:ring-green-500' : 'text-red-500 focus:ring-red-500';

      return (
          <div className="flex flex-col space-y-2 mt-2">
            <div className="flex items-center space-x-3 text-xs">
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name={`${side}TpType`}
                  className={`form-radio bg-gray-700 border-gray-600 ${color}`}
                  checked={currentType === 'equity_pct'}
                  onChange={() => setAndSave(typeKey, 'equity_pct')}
                />
                <span className="ml-1 text-gray-300">Equity %</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name={`${side}TpType`}
                  className={`form-radio bg-gray-700 border-gray-600 ${color}`}
                  checked={currentType === 'balance_pct'}
                  onChange={() => setAndSave(typeKey, 'balance_pct')}
                />
                <span className="ml-1 text-gray-300">Balance %</span>
              </label>
              <label className="flex items-center cursor-pointer">
                <input 
                  type="radio" 
                  name={`${side}TpType`}
                  className={`form-radio bg-gray-700 border-gray-600 ${color}`}
                  checked={currentType === 'fixed_money'}
                  onChange={() => setAndSave(typeKey, 'fixed_money')}
                />
                <span className="ml-1 text-gray-300">Fixed $</span>
              </label>
            </div>
            
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-400 uppercase font-bold">Target:</span>
              <input 
                type="number" 
                step="0.01"
                className={`bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-white w-24 text-sm focus:outline-none transition-colors ${side === 'buy' ? 'focus:border-green-500' : 'focus:border-red-500'}`}
                value={settings[valKey]}
                onChange={(e) => updateField(valKey, parseFloat(e.target.value) || 0)}
                onBlur={() => onSettingsSave()}
              />
              <span className="text-sm font-mono text-yellow-500">
                {currentType === 'fixed_money' ? '$' : '%'}
              </span>
            </div>
          </div>
      );
  };

  return (
    <div className={`bg-gray-850 border-b border-gray-800 p-4 shadow-lg z-20 transition-opacity duration-300 ${connected ? 'opacity-100' : 'opacity-60 pointer-events-none'}`}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* COL 1: System Controls (Switches + Emergency) */}
        <div className="lg:col-span-2 flex flex-col space-y-4 border-r border-gray-700 pr-4 h-full">
          <div className="flex flex-col space-y-3">
             <h3 className="text-xs text-gray-400 uppercase tracking-wider font-bold">System</h3>
             {/* Buy Switch */}
             <div className="flex justify-between items-center h-6">
                {isBuyClosing ? (
                    <div className="flex items-center space-x-1 text-yellow-500 font-bold animate-pulse">
                        <i className="fas fa-sync fa-spin text-xs"></i>
                        <span className="text-xs tracking-wide">CLOSING...</span>
                    </div>
                ) : (
                    <Switch 
                       label="BUY System" 
                       checked={isBuyOn} 
                       onChange={(val) => onControlToggle('buy', val)} 
                       color="green"
                    />
                )}
             </div>

             {/* Sell Switch */}
             <div className="flex justify-between items-center h-6">
                {isSellClosing ? (
                    <div className="flex items-center space-x-1 text-yellow-500 font-bold animate-pulse">
                        <i className="fas fa-sync fa-spin text-xs"></i>
                        <span className="text-xs tracking-wide">CLOSING...</span>
                    </div>
                ) : (
                    <Switch 
                       label="SELL System" 
                       checked={isSellOn} 
                       onChange={(val) => onControlToggle('sell', val)} 
                       color="red"
                    />
                )}
             </div>

             <div className="pt-2 border-t border-gray-700">
                <Switch 
                   label="Cyclic Run" 
                   checked={isCyclicOn} 
                   onChange={(val) => onControlToggle('cyclic', val)} 
                   color="blue"
                />
             </div>
          </div>

          <div className="pt-2">
            <button 
                onClick={onEmergencyClose}
                disabled={!connected}
                className={`w-full font-bold py-2 px-2 rounded border shadow-lg text-xs transition-all active:transform active:scale-95 flex items-center justify-center space-x-1 ${connected ? 'bg-red-900/80 hover:bg-red-700 text-red-100 border-red-600 shadow-red-900/50' : 'bg-gray-800 text-gray-500 border-gray-700 cursor-not-allowed'}`}
                title="Emergency Close All"
            >
                <i className="fas fa-skull-crossbones"></i>
                <span>CLOSE ALL</span>
            </button>
          </div>
        </div>

        {/* COL 2: Buy Config */}
        <div className="lg:col-span-5 flex flex-col gap-3 border-r border-gray-700 pr-4">
           <h3 className="text-xs text-green-500 uppercase tracking-wider font-bold border-b border-green-900/30 pb-1">
               Buy Configuration
           </h3>
           
           {/* Limit Price Row */}
           <div className="flex items-center justify-between">
              <div>
                 <span className="text-xs text-gray-400 font-bold">Start Limit Price</span>
                 <p className="text-[10px] text-gray-600">0 = Market Price</p>
              </div>
              <input 
                 type="number" 
                 step="0.00001"
                 className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-white w-28 font-mono focus:outline-none focus:border-green-500 transition-colors"
                 value={settings.buy_limit_price}
                 onChange={(e) => updateField('buy_limit_price', parseFloat(e.target.value) || 0)}
                 onBlur={() => onSettingsSave()}
               />
           </div>

           {/* TP Section */}
           <div className="bg-green-900/10 rounded p-2 border border-green-900/20">
               <span className="text-xs text-gray-400 font-bold">Take Profit Settings</span>
               {renderTpOptions('buy')}
           </div>
        </div>

        {/* COL 3: Sell Config */}
        <div className="lg:col-span-5 flex flex-col gap-3">
           <h3 className="text-xs text-red-500 uppercase tracking-wider font-bold border-b border-red-900/30 pb-1">
               Sell Configuration
           </h3>
           
           {/* Limit Price Row */}
           <div className="flex items-center justify-between">
              <div>
                 <span className="text-xs text-gray-400 font-bold">Start Limit Price</span>
                 <p className="text-[10px] text-gray-600">0 = Market Price</p>
              </div>
              <input 
                 type="number" 
                 step="0.00001"
                 className="bg-gray-700 border border-gray-600 rounded px-2 py-0.5 text-white w-28 font-mono focus:outline-none focus:border-red-500 transition-colors"
                 value={settings.sell_limit_price}
                 onChange={(e) => updateField('sell_limit_price', parseFloat(e.target.value) || 0)}
                 onBlur={() => onSettingsSave()}
               />
           </div>

           {/* TP Section */}
           <div className="bg-red-900/10 rounded p-2 border border-red-900/20">
               <span className="text-xs text-gray-400 font-bold">Take Profit Settings</span>
               {renderTpOptions('sell')}
           </div>
        </div>

      </div>
    </div>
  );
};

export default ControlPanel;