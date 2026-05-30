<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $fillable = ['actor', 'action', 'module', 'ip_address'];

    /**
     * Write an audit log entry.
     * Reads X-Audit-Actor from the current HTTP request header if actor is not supplied.
     */
    public static function log(string $action, string $module, ?string $actor = null): self
    {
        if (!$actor) {
            $actor = request()->header('X-Audit-Actor') ?: 'System';
        }

        return self::create([
            'actor'      => $actor,
            'action'     => $action,
            'module'     => $module,
            'ip_address' => request()->ip(),
        ]);
    }
}
