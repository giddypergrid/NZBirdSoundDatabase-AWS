import React, { useEffect, useCallback, useRef, useState } from 'react'

type Props<T, K extends keyof T> = {
    ItemComponent: React.ComponentType<{item: T; resourceUrl?: string} & React.RefAttributes<HTMLDivElement>>
    BatchSize: number
    ItemIndexType: K
    items: T[]
    className?: string
    listClassName?: string
    onItemClick?: (item: T) => void
    selectedKey?: T[K]
}

const InfiniteScrollArea = <T, K extends keyof T>({ItemComponent, BatchSize, ItemIndexType, items, className, listClassName, onItemClick, selectedKey}: Props<T, K>) => {

    const isBatchLoading = useRef<boolean>(false);
    const IntersectionRootRef = useRef<HTMLDivElement>(null); 
    const IntersectionObserverRef = useRef<Map<number, IntersectionObserver>>(new Map());
    const updateNextBatchRef = useRef<any>(() => {});
    const [buttomItemIndex, setButtomItemIndex] = useState<number>(BatchSize - 1);

    useEffect(()=>{
        setButtomItemIndex(BatchSize - 1)
    }, [items, BatchSize])

    useEffect(()=>{
        isBatchLoading.current = false;
    }, [buttomItemIndex, items])
    
    const updateNextBatch = (intersectedIndex: number) => {
        if (isBatchLoading.current) return;
        if (intersectedIndex == buttomItemIndex) {
            setButtomItemIndex(intersectedIndex + BatchSize)
            isBatchLoading.current = true;
        }
    }

    useEffect(() => {
        updateNextBatchRef.current = updateNextBatch;
    }, [updateNextBatch]);

    const SentinelRefWrapper = (index: number) => {
        return (node: HTMLDivElement | null) => {
            sentinelRef(node, index);
        };
    };

    const sentinelRef = useCallback((node: HTMLDivElement | null, index: number)=>{
        if (!node) return;
        if (IntersectionObserverRef.current.has(index)) return;
        const observer = new IntersectionObserver((entries)=>{
            if (entries[0].isIntersecting) {
                updateNextBatchRef.current(index)
            }
        })
        observer.observe(node)
        IntersectionObserverRef.current.set(index, observer)
    }, [])

    return(
        <div ref={IntersectionRootRef} className={className}>
            <ul className={listClassName || 'grid grid-cols-1 sm:grid-cols-2 gap-4'}>
                {items.slice(0, buttomItemIndex + 1).map((item: T, index)=>{
                    const isSelected = selectedKey !== undefined && item[ItemIndexType] === selectedKey;
                    return(
                        <li 
                            key={String(item[ItemIndexType])} 
                            className={`cursor-pointer transition-all duration-200 rounded-2xl ${
                              isSelected ? 'ring-2 ring-white/40 shadow-lg shadow-white/5' : 'hover:-translate-y-1'
                            }`}
                            onClick={() => onItemClick && onItemClick(item)}
                        >
                            <ItemComponent 
                                item={item}
                                ref={(index + 1) % BatchSize === 0 ? SentinelRefWrapper(index) : null}
                            />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}

export default InfiniteScrollArea;