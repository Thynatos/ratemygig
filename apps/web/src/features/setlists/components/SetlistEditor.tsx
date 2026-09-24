import { useState, useRef, useEffect, useId, type FormEvent } from 'react'
import { X, ChevronUp, ChevronDown, ExternalLink } from 'lucide-react'
import { useSongSearch } from '../api/songs'
import { useCreateSetlist, useUpdateSetlist, setlistSaveErrorMessage } from '../api/setlists'
import {
    useImportSetlist,
    importErrorMessage,
    type ImportedSetlistSource,
    type SetlistSongDraft,
} from '../api/setlistImport'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useToast } from '@/shared/hooks/useToast'
import { Button } from '@/shared/components/ui/Button'
import { Input } from '@/shared/components/ui/Input'
import { Textarea } from '@/shared/components/ui/Textarea'
import { sanitizeText } from '@/shared/lib/sanitize'
import { cn, formatDate } from '@/shared/lib/utils'
import type { Event, SetlistWithSongs } from '@core/index'

const IMPORT_TOAST_ID = 'setlist-import'
const SAVE_TOAST_ID = 'setlist-save'

interface SetlistEditorProps {
    eventId: string
    existingSetlist?: SetlistWithSongs
    onClose: () => void
    /** The artist new songs are searched and filed under (soleArtistId); unset leaves them unfiled. */
    artistId?: string
    /** The gig being written up: a setlist.fm import is checked against its line-up and date. */
    event?: Pick<Event, 'start_at' | 'lineup'>
}

export function SetlistEditor({
    eventId,
    existingSetlist,
    onClose,
    artistId,
    event,
}: SetlistEditorProps) {
    const { user } = useAuth()
    const isEditing = !!existingSetlist
    const searchId = useId()
    const importId = useId()
    const importHintId = useId()
    const toast = useToast()

    const [songs, setSongs] = useState<SetlistSongDraft[]>(() => {
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
    const [importInput, setImportInput] = useState('')
    const [importSource, setImportSource] = useState<ImportedSetlistSource | null>(null)

    const createSetlist = useCreateSetlist()
    const updateSetlist = useUpdateSetlist()
    const importSetlist = useImportSetlist()
    // An import says whose set this is; otherwise the gig's only act does.
    const songArtistId = importSource?.artistId ?? artistId
    const { data: searchResults = [] } = useSongSearch(searchQuery, songArtistId)

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

    // This editor's errors belong to it; they go when the editor does.
    const { dismiss: dismissToast } = toast
    useEffect(
        () => () => {
            dismissToast(IMPORT_TOAST_ID)
            dismissToast(SAVE_TOAST_ID)
        },
        [dismissToast]
    )

    const handleImport = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const input = importInput.trim()
        if (!input || importSetlist.isPending) return

        if (
            songs.length > 0 &&
            !window.confirm(
                `Importing replaces the ${songs.length === 1 ? 'song' : `${songs.length} songs`} already listed. Carry on?`
            )
        ) {
            return
        }

        importSetlist.mutate(
            { input, eventId, lineup: event?.lineup ?? [], eventStartAt: event?.start_at },
            {
                onSuccess: result => {
                    toast.dismiss(IMPORT_TOAST_ID)
                    setSongs(result.songs)
                    setImportSource(result.source)
                    setImportInput('')
                },
                onError: error => {
                    toast.error({
                        id: IMPORT_TOAST_ID,
                        title: "Couldn't import",
                        message: importErrorMessage(error),
                    })
                },
            }
        )
    }

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
                artistId: songArtistId,
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

    const handleSaveError = (error: unknown) => {
        toast.error({
            id: SAVE_TOAST_ID,
            title: "Couldn't save",
            message: setlistSaveErrorMessage(error),
        })
    }

    const handleSave = () => {
        if (!user) return

        if (isEditing && existingSetlist) {
            updateSetlist.mutate(
                { setlistId: existingSetlist.id, notes: setlistNotes },
                { onSuccess: onClose, onError: handleSaveError }
            )
        } else {
            createSetlist.mutate(
                {
                    eventId,
                    songs: songs.map(s => ({
                        songId: s.id,
                        songName: s.name,
                        artistId: s.artistId,
                        position: s.position,
                        isEncore: s.isEncore,
                        isDebut: s.isDebut,
                        notes: s.notes,
                    })),
                    notes: setlistNotes,
                },
                { onSuccess: onClose, onError: handleSaveError }
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
                <form onSubmit={handleImport} noValidate>
                    <label htmlFor={importId} className="input-label">
                        Import from setlist.fm
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                            <Input
                                id={importId}
                                type="url"
                                inputMode="url"
                                value={importInput}
                                onChange={e => setImportInput(e.target.value)}
                                placeholder="https://www.setlist.fm/setlist/…"
                                autoComplete="off"
                                spellCheck={false}
                                aria-describedby={importHintId}
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="secondary"
                            disabled={!importInput.trim()}
                            isLoading={importSetlist.isPending}
                            loadingLabel="Importing from setlist.fm"
                        >
                            Import
                        </Button>
                    </div>
                    <p id={importHintId} className="input-hint">
                        Paste the link to the setlist page. Nothing is saved until you save the
                        setlist.
                    </p>
                </form>
            )}

            {!isEditing && (
                <div className="relative" ref={searchRef}>
                    <label htmlFor={searchId} className="input-label">
                        Add a song
                    </label>
                    <div className="flex gap-2">
                        <div className="flex-1 min-w-0">
                            <Input
                                id={searchId}
                                value={searchQuery}
                                onChange={e => {
                                    setSearchQuery(e.target.value)
                                    setShowSearch(true)
                                }}
                                onFocus={() => setShowSearch(true)}
                                placeholder="Song title"
                                autoComplete="off"
                            />
                        </div>
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

            {importSource && songs.length > 0 && (
                <div className="border border-rail px-4 py-3 space-y-1.5">
                    <p className="voice-label text-bone-dim">From setlist.fm — check it before you save</p>
                    <p className="text-ui-sm text-bone">
                        {sanitizeText(importSource.artistName)} ·{' '}
                        {sanitizeText(importSource.venueName) || 'Venue unknown'} ·{' '}
                        <span className="tnum">{formatDate(importSource.eventDate, 'EEE d MMM yyyy')}</span>
                    </p>
                    {!importSource.sameNight && event && (
                        <p className="text-ui-sm text-bone">
                            This gig is listed for{' '}
                            <span className="tnum">{formatDate(event.start_at, 'EEE d MMM yyyy')}</span>.
                            Make sure it's the same night before you save.
                        </p>
                    )}
                    <p className="text-ui-sm text-bone-faint">
                        Source:{' '}
                        <a
                            href={importSource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-bone-dim underline hover:text-bone"
                        >
                            {sanitizeText(importSource.artistName)} setlist on setlist.fm
                            <ExternalLink className="inline w-3 h-3 ml-1 -mt-0.5" aria-hidden="true" />
                            <span className="sr-only"> (opens in a new tab)</span>
                        </a>
                    </p>
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

                                <span className="row-body !flex-row !items-center !justify-start">
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
                        No songs yet. Import them from setlist.fm, or add them in the order they
                        were played.
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
