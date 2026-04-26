import { useState, useRef, useEffect } from 'react'
import { X, Plus, ChevronUp, ChevronDown, Music, Star } from 'lucide-react'
import { useSongSearch } from '../api/songs'
import { useCreateSetlist, useUpdateSetlist } from '../api/setlists'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { sanitizeText } from '@/shared/lib/sanitize'
import type { SetlistWithSongs } from '@core/index'

interface SetlistEditorProps {
    eventId: string
    existingSetlist?: SetlistWithSongs
    onClose: () => void
    artistId?: string
}

interface SongEntry {
    id?: string
    name: string
    position: number
    isEncore: boolean
    isDebut: boolean
    notes: string
}

export function SetlistEditor({ eventId, existingSetlist, onClose, artistId }: SetlistEditorProps) {
    const { user } = useAuth()
    const isEditing = !!existingSetlist

    const [songs, setSongs] = useState<SongEntry[]>(() => {
        if (!existingSetlist) return []
        return existingSetlist.songs.map(ss => ({
            id: ss.song_id,
            name: ss.song?.name ?? 'Unknown',
            position: ss.position,
            isEncore: ss.is_encore,
            isDebut: ss.is_debut,
            notes: ss.notes ?? '',
        }))
    })
    const [setlistNotes, setSetlistNotes] = useState(existingSetlist?.notes ?? '')
    const [searchQuery, setSearchQuery] = useState('')
    const [showSearch, setShowSearch] = useState(false)

    const createSetlist = useCreateSetlist()
    const updateSetlist = useUpdateSetlist()
    const { data: searchResults = [] } = useSongSearch(searchQuery, artistId)

    const searchRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowSearch(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleAddSong = (songId: string, songName: string) => {
        const nextPosition = songs.length > 0 ? Math.max(...songs.map(s => s.position)) + 1 : 0
        setSongs(prev => [...prev, {
            id: songId,
            name: songName,
            position: nextPosition,
            isEncore: false,
            isDebut: false,
            notes: '',
        }])
        setSearchQuery('')
        setShowSearch(false)
    }

    const handleRemoveSong = (index: number) => {
        setSongs(prev => {
            const updated = prev.filter((_, i) => i !== index)
            return updated.map((s, i) => ({ ...s, position: i }))
        })
    }

    const handleMoveSong = (index: number, direction: 'up' | 'down') => {
        const newIndex = direction === 'up' ? index - 1 : index + 1
        if (newIndex < 0 || newIndex >= songs.length) return
        setSongs(prev => {
            const updated = [...prev]
            const [moved] = updated.splice(index, 1)
            updated.splice(newIndex, 0, moved)
            return updated.map((s, i) => ({ ...s, position: i }))
        })
    }

    const handleToggleEncore = (index: number) => {
        setSongs(prev => prev.map((s, i) => i === index ? { ...s, isEncore: !s.isEncore } : s))
    }

    const handleToggleDebut = (index: number) => {
        setSongs(prev => prev.map((s, i) => i === index ? { ...s, isDebut: !s.isDebut } : s))
    }

    const handleSave = () => {
        if (!user) return

        if (isEditing && existingSetlist) {
            updateSetlist.mutate(
                { setlistId: existingSetlist.id, notes: setlistNotes },
                { onSuccess: onClose },
            )
        } else {
            createSetlist.mutate(
                {
                    eventId,
                    songs: songs.map(s => ({
                        songId: s.id,
                        songName: s.name,
                        artistId,
                        position: s.position,
                        isEncore: s.isEncore,
                        isDebut: s.isDebut,
                        notes: s.notes,
                    })),
                    notes: setlistNotes,
                },
                { onSuccess: onClose },
            )
        }
    }

    const isPending = createSetlist.isPending || updateSetlist.isPending
    const encoreIndex = songs.findIndex(s => s.isEncore)

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-white">
                    {isEditing ? 'Edit Setlist' : 'Add Setlist'}
                </h2>
                <button onClick={onClose} className="text-surface-400 hover:text-white transition-colors">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div>
                <label className="block text-sm text-surface-400 mb-1">Notes (optional)</label>
                <textarea
                    value={setlistNotes}
                    onChange={e => setSetlistNotes(e.target.value)}
                    placeholder="Add notes about this setlist..."
                    className="w-full bg-surface-800 border border-surface-600 rounded-xl px-4 py-3 text-white placeholder-surface-500 focus:border-primary-500 focus:ring-1 focus:ring-primary-500/20 outline-none resize-none"
                    rows={2}
                />
            </div>

            <div className="relative" ref={searchRef}>
                <div className="flex gap-2">
                    <Input
                        value={searchQuery}
                        onChange={e => { setSearchQuery(e.target.value); setShowSearch(true) }}
                        onFocus={() => setShowSearch(true)}
                        placeholder="Search for a song..."
                        className="flex-1"
                    />
                    <Button
                        variant="secondary"
                        onClick={() => {
                            if (searchQuery.trim()) {
                                handleAddSong('', searchQuery.trim())
                            }
                        }}
                    >
                        <Plus className="w-4 h-4" />
                    </Button>
                </div>

                {showSearch && searchQuery.trim() && (
                    <div className="absolute z-10 top-full mt-1 w-full bg-surface-800 border border-surface-600 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {searchResults.map(song => (
                            <button
                                key={song.id}
                                onClick={() => handleAddSong(song.id, song.name)}
                                className="w-full text-left px-4 py-2 text-white hover:bg-surface-700 transition-colors"
                            >
                                {sanitizeText(song.name)}
                            </button>
                        ))}
                        {searchQuery.trim() && !searchResults.some(s => s.name.toLowerCase() === searchQuery.trim().toLowerCase()) && (
                            <button
                                onClick={() => handleAddSong('', searchQuery.trim())}
                                className="w-full text-left px-4 py-2 text-primary-400 hover:bg-surface-700 transition-colors"
                            >
                                <Plus className="w-4 h-4 inline mr-2" />
                                Create &ldquo;{sanitizeText(searchQuery.trim())}&rdquo;
                            </button>
                        )}
                    </div>
                )}
            </div>

            {songs.length > 0 && (
                <div className="space-y-1">
                    {songs.map((song, index) => (
                        <div key={index}>
                            {song.isEncore && (encoreIndex === index) && (
                                <div className="flex items-center gap-2 pt-2 pb-1">
                                    <Star className="w-3 h-3 text-accent-400" />
                                    <span className="text-accent-400 text-sm font-medium">Encore</span>
                                    <div className="flex-1 border-t border-accent-500/30" />
                                </div>
                            )}
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-800/50 border border-surface-700">
                                <span className="text-surface-500 font-mono text-sm w-5 text-right">{index + 1}</span>
                                <span className="flex-1 text-white text-sm font-medium truncate">{sanitizeText(song.name)}</span>
                                <button
                                    onClick={() => handleToggleEncore(index)}
                                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${song.isEncore ? 'bg-accent-500/20 text-accent-300 border-accent-500/30' : 'bg-surface-700/50 text-surface-400 border-surface-600'}`}
                                >
                                    Encore
                                </button>
                                <button
                                    onClick={() => handleToggleDebut(index)}
                                    className={`text-xs px-2 py-0.5 rounded-full border transition-colors ${song.isDebut ? 'bg-warning-500/20 text-yellow-300 border-yellow-500/30' : 'bg-surface-700/50 text-surface-400 border-surface-600'}`}
                                >
                                    Debut
                                </button>
                                <div className="flex flex-col">
                                    <button
                                        onClick={() => handleMoveSong(index, 'up')}
                                        disabled={index === 0}
                                        className="text-surface-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronUp className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleMoveSong(index, 'down')}
                                        disabled={index === songs.length - 1}
                                        className="text-surface-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                                    >
                                        <ChevronDown className="w-3 h-3" />
                                    </button>
                                </div>
                                <button
                                    onClick={() => handleRemoveSong(index)}
                                    className="text-surface-500 hover:text-red-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {songs.length === 0 && (
                <div className="text-center py-8 text-surface-500">
                    <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No songs added yet. Search for songs above.</p>
                </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button
                    onClick={handleSave}
                    disabled={isPending || (!isEditing && songs.length === 0)}
                    isLoading={isPending}
                >
                    {isEditing ? 'Update Setlist' : 'Create Setlist'}
                </Button>
            </div>
        </div>
    )
}