import { useState, useRef, useEffect, useId } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { useSongSearch } from '../api/songs'
import { useCreateSetlist, useUpdateSetlist } from '../api/setlists'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { sanitizeText } from '@/shared/lib/sanitize'
import { cn } from '@/shared/lib/utils'
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

export function SetlistEditor({
    eventId,
    existingSetlist,
    onClose,
    artistId,
}: SetlistEditorProps) {
    const { user } = useAuth()
    const isEditing = !!existingSetlist
    const searchId = useId()

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
        setSongs(prev => [
            ...prev,
            {
                id: songId,
                name: songName,
                position: nextPosition,
                isEncore: false,
                isDebut: false,
                notes: '',
            },
        ])
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
        setSongs(prev => prev.map((s, i) => (i === index ? { ...s, isEncore: !s.isEncore } : s)))
    }

    const handleToggleDebut = (index: number) => {
        setSongs(prev => prev.map((s, i) => (i === index ? { ...s, isDebut: !s.isDebut } : s)))
    }

    const handleSave = () => {
        if (!user) return

        if (isEditing && existingSetlist) {
            updateSetlist.mutate(
                { setlistId: existingSetlist.id, notes: setlistNotes },
                { onSuccess: onClose }
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
                { onSuccess: onClose }
            )
        }
    }

    const isPending = createSetlist.isPending || updateSetlist.isPending
    const encoreIndex = songs.findIndex(s => s.isEncore)
    const canCreate = searchQuery.trim().length > 0
    const exactMatch = searchResults.some(
        s => s.name.toLowerCase() === searchQuery.trim().toLowerCase()
    )

    return (
        <div className="space-y-5">
            <div className="flex items-center justify-between gap-4">
                <h2 className="voice-slot text-ui text-bone">
                    {isEditing ? 'Edit the setlist' : 'Write down the setlist'}
                </h2>
                <button type="button" onClick={onClose} className="btn-icon">
                    <X className="w-4 h-4" aria-hidden="true" />
                    <span className="sr-only">Close the editor</span>
                </button>
            </div>

            <Textarea
                label="Notes"
                name="setlist-notes"
                value={setlistNotes}
                onChange={e => setSetlistNotes(e.target.value)}
                placeholder="Anything worth remembering — a cover, a false start, a guest."
                className="min-h-[70px]"
                hint="Optional."
            />

            {!isEditing && (
                <div className="relative" ref={searchRef}>
                    <label htmlFor={searchId} className="input-label">
                        Add a song
                    </label>
                    <div className="flex gap-2">
                        <Input
                            id={searchId}
                            value={searchQuery}
                            onChange={e => {
                                setSearchQuery(e.target.value)
                                setShowSearch(true)
                            }}
                            onFocus={() => setShowSearch(true)}
                            placeholder="Song title"
                            className="flex-1"
                            autoComplete="off"
                        />
                        <Button
                            variant="secondary"
                            onClick={() => {
                                if (canCreate) handleAddSong('', searchQuery.trim())
                            }}
                            disabled={!canCreate}
                        >
                            Add
                        </Button>
                    </div>

                    {showSearch && canCreate && (
                        <div className="absolute z-10 top-full mt-1 w-full border border-rail-strong bg-board shadow-lift max-h-56 overflow-y-auto">
                            {searchResults.map(song => (
                                <button
                                    key={song.id}
                                    type="button"
                                    onClick={() => handleAddSong(song.id, song.name)}
                                    className="w-full text-left px-3 py-2 text-ui text-bone border-b border-rail transition-colors duration-150 ease-board hover:bg-board-raised"
                                >
                                    {sanitizeText(song.name)}
                                </button>
                            ))}
                            {!exactMatch && (
                                <button
                                    type="button"
                                    onClick={() => handleAddSong('', searchQuery.trim())}
                                    className="w-full text-left px-3 py-2 voice-label text-strip transition-colors duration-150 ease-board hover:bg-board-raised"
                                >
                                    Add “{sanitizeText(searchQuery.trim())}” as a new song
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {songs.length > 0 ? (
                <ol className="rail-list">
                    {songs.map((song, index) => (
                        <li key={index}>
                            {song.isEncore && encoreIndex === index && (
                                <p className="bg-board-raised px-4 py-1.5 voice-label text-strip border-b border-rail">
                                    Encore
                                </p>
                            )}
                            <div className="row items-center gap-2">
                                <span className="row-slot !w-9">
                                    <span className="voice-data text-ui-sm text-bone-faint tabular-nums">
                                        {String(index + 1).padStart(2, '0')}
                                    </span>
                                </span>

                                <span className="row-body !flex-row !items-center">
                                    <span className="text-ui text-bone truncate">
                                        {sanitizeText(song.name)}
                                    </span>
                                </span>

                                <span className="row-end !flex-row items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleToggleEncore(index)}
                                        aria-pressed={song.isEncore}
                                        className={cn(
                                            'voice-label border px-1.5 py-1 transition-colors duration-150 ease-board',
                                            song.isEncore
                                                ? 'bg-strip text-strip-ink border-strip'
                                                : 'text-bone-faint border-rail hover:text-bone'
                                        )}
                                    >
                                        Encore
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleDebut(index)}
                                        aria-pressed={song.isDebut}
                                        className={cn(
                                            'voice-label border px-1.5 py-1 transition-colors duration-150 ease-board',
                                            song.isDebut
                                                ? 'bg-strip text-strip-ink border-strip'
                                                : 'text-bone-faint border-rail hover:text-bone'
                                        )}
                                    >
                                        Debut
                                    </button>
                                    <span className="flex flex-col">
                                        <button
                                            type="button"
                                            onClick={() => handleMoveSong(index, 'up')}
                                            disabled={index === 0}
                                            className="text-bone-faint hover:text-bone disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                                            <span className="sr-only">
                                                Move {sanitizeText(song.name)} earlier
                                            </span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleMoveSong(index, 'down')}
                                            disabled={index === songs.length - 1}
                                            className="text-bone-faint hover:text-bone disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            <ChevronDown
                                                className="w-3.5 h-3.5"
                                                aria-hidden="true"
                                            />
                                            <span className="sr-only">
                                                Move {sanitizeText(song.name)} later
                                            </span>
                                        </button>
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSong(index)}
                                        className="text-bone-faint hover:text-struck"
                                    >
                                        <X className="w-4 h-4" aria-hidden="true" />
                                        <span className="sr-only">
                                            Remove {sanitizeText(song.name)}
                                        </span>
                                    </button>
                                </span>
                            </div>
                        </li>
                    ))}
                </ol>
            ) : (
                !isEditing && (
                    <p className="border border-dashed border-rail-strong px-4 py-6 text-center text-ui-sm text-bone-faint">
                        No songs yet. Search above and add them in the order they were played.
                    </p>
                )
            )}

            <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={onClose}>
                    Cancel
                </Button>
                <Button
                    onClick={handleSave}
                    disabled={!isEditing && songs.length === 0}
                    isLoading={isPending}
                    loadingLabel="Saving the setlist"
                >
                    {isEditing ? 'Save changes' : 'Save setlist'}
                </Button>
            </div>
        </div>
    )
}
