import { useTheme, Theme } from '../../../hooks/useTheme';
import { ThemePreview } from '../ThemePreview';

const themeOptions = [
  {
    value: 'light' as Theme,
    label: 'Light',
    description: 'Clean and bright interface'
  },
  {
    value: 'dark' as Theme,
    label: 'Dark',
    description: 'Easy on the eyes in low light'
  }
];

export const AppearanceSettings = () => {
  const { theme, isLoading, changeTheme } = useTheme();

  const getTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-900';
      case 'dark':
        return 'text-white';
      default:
        return 'text-white';
    }
  };

  const getSecondaryTextColor = () => {
    switch (theme) {
      case 'light':
        return 'text-gray-600';
      case 'dark':
        return 'text-gray-300';
      default:
        return 'text-gray-300';
    }
  };

  const handleThemePreviewClick = async (themeValue: Theme) => {
    console.log('Theme preview clicked:', themeValue);
    try {
      await changeTheme(themeValue);
      console.log('Theme changed successfully to:', themeValue);
    } catch (error) {
      console.error('Failed to change theme:', error);
    }
  };

  return (
    <div className="p-2 space-y-8">
      {/* Theme Previews */}
      <div className="space-y-4">
        <div>
          <h3 className={`text-sm font-medium ${getTextColor()} mb-3`}>Choose Your Theme</h3>
          <p className={`text-xs ${getSecondaryTextColor()} mb-4`}>Click on any preview to switch themes</p>
          <p className={`text-xs ${getSecondaryTextColor()}`}>Current theme: {theme}</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {themeOptions.map((option) => (
            <div key={option.value} className="flex flex-col items-center space-y-3">
              <ThemePreview
                theme={option.value}
                isSelected={option.value === theme}
                onClick={() => handleThemePreviewClick(option.value)}
              />
              <div className="text-center">
                <h4 className={`text-sm font-medium ${getTextColor()}`}>{option.label}</h4>
                <p className={`text-xs ${getSecondaryTextColor()} mt-1`}>{option.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};