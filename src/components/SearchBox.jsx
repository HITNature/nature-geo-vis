import { useState, useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { apiFetch } from '../utils/api';

function SearchBox() {
    const map = useMap();
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef(null);

    // 点击外部关闭下拉框
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // 监听输入，防抖获取推荐
    useEffect(() => {
        if (!query || query.trim() === '') {
            setSuggestions([]);
            return;
        }

        const delayDebounce = setTimeout(async () => {
            setIsLoading(true);
            try {
                // 1. 优先查询数据库
                const data = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
                
                if (data && data.length > 0) {
                    setSuggestions(data);
                    setShowDropdown(true);
                } else {
                    // 如果数据库无结果，不立即请求 Nominatim，等用户回车或点击搜索再请求，或者稍微延迟请求
                    setSuggestions([]);
                }
            } catch (error) {
                console.error('获取搜索建议失败:', error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounce);
    }, [query]);

    // 触发搜索（回车或点击搜索按钮）
    const handleSearch = async (e) => {
        if (e) e.preventDefault();
        if (!query || query.trim() === '') return;

        setIsLoading(true);
        setShowDropdown(false);

        try {
            // 1. 优先查询数据库
            const data = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
            if (data && data.length > 0) {
                // 选中第一个匹配项
                selectItem(data[0]);
                return;
            }

            // 2. 数据库未找到，调用 OpenStreetMap Nominatim API
            console.log('数据库未找到，正在请求 Nominatim API...');
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5`
            );
            const nominatimData = await response.json();

            if (nominatimData && nominatimData.length > 0) {
                const first = nominatimData[0];
                const lat = parseFloat(first.lat);
                const lon = parseFloat(first.lon);
                
                // 确定缩放级别
                let zoom = 12;
                if (first.type === 'administrative') {
                    if (first.class === 'boundary') zoom = 10;
                }

                map.flyTo([lat, lon], zoom, {
                    animate: true,
                    duration: 1.5
                });
                
                // 添加到临时建议中
                setSuggestions(nominatimData.map(item => ({
                    name: item.display_name,
                    type: 'osm',
                    lng: parseFloat(item.lon),
                    lat: parseFloat(item.lat)
                })));
                setShowDropdown(true);
            } else {
                alert('未找到该地址，请尝试其他关键词');
            }
        } catch (error) {
            console.error('搜索出错:', error);
            alert('搜索出错，请稍后再试');
        } finally {
            setIsLoading(false);
        }
    };

    // 选择某个搜索结果
    const selectItem = (item) => {
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lng);
        
        if (isNaN(lat) || !isFinite(lat) || isNaN(lng) || !isFinite(lng)) {
            console.error('无效的经纬度:', item);
            return;
        }

        let zoom = 12;
        if (item.type === 'province') {
            zoom = 7;
        } else if (item.type === 'city') {
            zoom = 10;
        } else if (item.type === 'district') {
            zoom = 12;
        } else if (item.type === 'poi') {
            zoom = 15;
        }

        map.flyTo([lat, lng], zoom, {
            animate: true,
            duration: 1.5
        });

        setQuery(item.name);
        setShowDropdown(false);
    };

    // 格式化类型标签
    const getTypeLabel = (type) => {
        switch (type) {
            case 'province': return '省份';
            case 'city': return '城市';
            case 'district': return '区县';
            case 'poi': return '地标/学校';
            case 'osm': return '外部地址';
            default: return '地点';
        }
    };

    return (
        <div className="search-box-container" ref={dropdownRef}>
            <form onSubmit={handleSearch} className="search-form glass-panel">
                <input
                    type="text"
                    placeholder="搜索地址或学校 (如: 哈尔滨)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => query && suggestions.length > 0 && setShowDropdown(true)}
                    className="search-input"
                />
                <button type="submit" className="search-btn" disabled={isLoading}>
                    {isLoading ? (
                        <span className="search-spinner"></span>
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    )}
                </button>
            </form>

            {showDropdown && suggestions.length > 0 && (
                <div className="search-dropdown glass-panel">
                    {suggestions.map((item, idx) => (
                        <div
                            key={idx}
                            className="search-suggestion-item"
                            onClick={() => selectItem(item)}
                        >
                            <span className="suggestion-name">{item.name}</span>
                            <span className={`suggestion-badge badge-${item.type}`}>
                                {getTypeLabel(item.type)}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default SearchBox;
