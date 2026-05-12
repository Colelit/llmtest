interface SidebarToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export default function SidebarToggle({ isCollapsed, onToggle }: SidebarToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="absolute top-4 right-2 p-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors duration-200 z-10"
      title={isCollapsed ? '展开侧边栏' : '折叠侧边栏'}
    >
      {isCollapsed ? (
        // 右箭头图标 (展开)
        <svg 
          className="w-5 h-5 text-gray-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      ) : (
        // 左箭头图标 (折叠)
        <svg 
          className="w-5 h-5 text-gray-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      )}
    </button>
  );
}