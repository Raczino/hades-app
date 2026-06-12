import React, { useEffect, useState, useRef } from 'react';
import './Search.css';

const Search = ({
	value: propValue = undefined,
	onChange = () => {},
	onSearch = () => {},
	suggestions = [], // array of strings or {id, label}
	fetchSuggestions = null, // async function(query) => [{id,label},...]
	placeholder = 'Search...',
	debounceMs = 300,
	showClear = true,
	className = '',
	onSelect = () => {}
}) => {
	const [value, setValue] = useState(propValue !== undefined ? propValue : '');
	const [open, setOpen] = useState(false);
	const [items, setItems] = useState([]);
	const [loading, setLoading] = useState(false);
	const [active, setActive] = useState(-1);
	const mounted = useRef(true);
	const debounceRef = useRef(null);
	const inputRef = useRef(null);

	useEffect(() => {
		mounted.current = true;
		return () => { mounted.current = false; clearTimeout(debounceRef.current); };
	}, []);

	useEffect(() => {
		// only sync when parent explicitly provides a value (controlled mode)
		if (propValue !== undefined) {
			setValue(propValue);
		}
	}, [propValue]);

	useEffect(() => {
		// debounce suggestions
		clearTimeout(debounceRef.current);
		if (!value) {
			// avoid forcing state update if items is already empty / open is already false
			setItems((prev) => (Array.isArray(prev) && prev.length > 0 ? [] : prev));
			setOpen((prev) => (prev ? false : prev));
			return;
		}
		let abortController = null;
		debounceRef.current = setTimeout(async () => {
			if (fetchSuggestions) {
				abortController = new AbortController();
				try {
					setLoading(true);
					const res = await fetchSuggestions(value, abortController.signal);
					if (!mounted.current) return;
					setItems(Array.isArray(res) ? res : []);
					setOpen(true);
				} catch (err) {
					if (err?.name === 'AbortError') return;
					if (mounted.current) setItems([]);
				} finally {
					if (mounted.current) setLoading(false);
				}
			} else {
				// filter provided suggestions (strings or objects)
				const lowered = value.toLowerCase();
				const filtered = (Array.isArray(suggestions) ? suggestions : [])
					.filter(s => {
						const label = (typeof s === 'string') ? s : (s.label || '');
						return label.toLowerCase().includes(lowered);
					})
					.slice(0, 8);
				setItems(filtered);
				setOpen(filtered.length > 0);
			}
			setActive(-1);
		}, debounceMs);

		return () => { clearTimeout(debounceRef.current); if (abortController) abortController.abort(); };
	}, [value, suggestions, fetchSuggestions, debounceMs]);

	const handleChange = (e) => {
		const v = e.target.value;
		setValue(v);
		onChange(v);
	};

	const handleClear = () => {
		setValue('');
		onChange('');
		// inform parent to reset search results to initial state
		try { onSearch(''); } catch (e) { /* ignore if not provided */ }
		setItems([]);
		setOpen(false);
		inputRef.current?.focus();
	};

	const handleKeyDown = (e) => {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setActive((a) => Math.min(a + 1, items.length - 1));
			setOpen(true);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setActive((a) => Math.max(a - 1, 0));
		} else if (e.key === 'Enter') {
			// prevent form submit / page reload when Search is placed inside a <form>
			e.preventDefault();
			if (open && active >= 0 && items[active]) {
				_select(items[active]);
			} else {
				onSearch(value);
				setOpen(false);
			}
		} else if (e.key === 'Escape') {
			setOpen(false);
		}
	};

	const _select = (item) => {
		const label = (typeof item === 'string') ? item : (item.label || '');
		setValue(label);
		onChange(label);
		onSelect(item);
		onSearch(label);
		setOpen(false);
	};

	return (
		<div className={`search-root ${className}`}>
			<div className="search-input-wrap">
				<input
					ref={inputRef}
					type="text"
					className="search-input"
					placeholder={placeholder}
					value={value}
					onChange={handleChange}
					onKeyDown={handleKeyDown}
					onFocus={() => { if (items.length) setOpen(true); }}
					aria-autocomplete="list"
					aria-expanded={open}
				/>
				{showClear && value && (
					<button
						type="button"
						className="search-clear"
						aria-label="Clear"
						onMouseDown={(e) => e.preventDefault()} /* prevent form submit on mousedown */
						onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClear(); }}
					>
						✕
					</button>
				)}
				<button
					type="button"
					className="search-btn"
					aria-label="Search"
					onMouseDown={(e) => e.preventDefault()} /* prevent form submit on mousedown */
					onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSearch(value); setOpen(false); }}
				>
					🔍
				</button>
			</div>

			{open && items && items.length > 0 && (
				<ul className="search-suggestions" role="listbox">
					{loading && <li className="loading">Loading…</li>}
					{items.map((it, i) => {
						const label = (typeof it === 'string') ? it : (it.label || '');
						return (
							<li
								key={typeof it === 'object' ? (it.id ?? label + i) : label + i}
								className={`suggestion-item ${i === active ? 'active' : ''}`}
								role="option"
								aria-selected={i === active}
								onMouseDown={(e) => { e.preventDefault(); _select(it); }}
								onMouseEnter={() => setActive(i)}
							>
								{label}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
};

export default Search;
