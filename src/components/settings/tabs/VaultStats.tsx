interface VaultStats {
    total: number;
    byType: Record<string, number>;
}

interface VaultStatsProps {
    stats: VaultStats | null;
}

export const VaultStats = ({ stats }: VaultStatsProps) => (
    <div className="p-4">
        <h3 className="text-base font-medium text-white mb-4">Vault Statistics</h3>
        <div className="space-y-2 rounded-lg bg-gray-800/50 p-4">
            {stats ? (
                <>
                    <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Total Items</span>
                        <span className="font-medium text-white">{stats.total}</span>
                    </div>
                    {Object.entries(stats.byType).length > 0 && <div className="pt-2 border-t border-gray-700/50" />}
                    {Object.entries(stats.byType).map(([type, count]) => (
                        <div key={type} className="flex justify-between text-sm pl-2">
                            <span className="text-gray-500">{type}</span>
                            <span className="font-medium text-gray-300">{count}</span>
                        </div>
                    ))}
                </>
            ) : (
                <p className="text-sm text-gray-500">Loading stats...</p>
            )}
        </div>
    </div>
);