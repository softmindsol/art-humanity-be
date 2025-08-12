import mongoose from 'mongoose';

const paintPixelSchema = new mongoose.Schema({
    // Canvas Configuration
    canvasResolution: {
        type: Number,
        required: true,
        enum: [0.25, 0.5, 1, 2, 4],
        default: 1
    },
    canvasId:{
        type:String,
        required:true
    },
    canvasSize: {
        type: Number,
        required: true,
        validate: {
            validator: function (v) {
                return [256, 512, 1024, 2048, 4096].includes(v);
            },
            message: 'Canvas size must be 256, 512, 1024, 2048, or 4096'
        }
    },

    // Stroke Path Data
    strokePath: [{
        fromX: {
            type: Number,
            required: true,
            min: 0
        },
        fromY: {
            type: Number,
            required: true,
            min: 0
        },
        toX: {
            type: Number,
            required: true,
            min: 0
        },
        toY: {
            type: Number,
            required: true,
            min: 0
        }
    }],

    // Brush Properties
    brushSize: {
        type: Number,
        required: true,
        min: 1,
        max: 50,
        default: 3
    },

    // Color Properties
    color: {
        r: {
            type: Number,
            required: true,
            min: 0,
            max: 255
        },
        g: {
            type: Number,
            required: true,
            min: 0,
            max: 255
        },
        b: {
            type: Number,
            required: true,
            min: 0,
            max: 255
        },
        a: {
            type: Number,
            required: true,
            min: 0,
            max: 1,
            default: 1
        }
    },

    // Drawing Mode
    mode: {
        type: String,
        required: true,
        enum: ['brush', 'eraser'],
        default: 'brush'
    },
    projectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Project', // Yeh 'Project' model se jod raha hai
        required: true,
        index: true
    }, 

    // Session and User Data
    sessionId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },

    // Canvas Context
    zoomLevel: {
        type: Number,
        min: 0.1,
        max: 8,
        default: 1
    },
    canvasOffset: {
        x: {
            type: Number,
            default: 0
        },
        y: {
            type: Number,
            default: 0
        }
    },

    // Metadata
    strokeStartTime: {
        type: Date,
        default: Date.now
    },
    strokeEndTime: {
        type: Date,
        default: Date.now
    },

    // For tile-based rendering
    tileCoordinates: [{
        tileX: Number,
        tileY: Number,
        tileSize: {
            type: Number,
            default: 64
        }
    }]
}, {
    timestamps: true,
    collection: 'paintpixels'
});

// Indexes for performance
paintPixelSchema.index({ sessionId: 1, createdAt: -1 });
paintPixelSchema.index({ canvasResolution: 1, createdAt: -1 });
paintPixelSchema.index({ 'tileCoordinates.tileX': 1, 'tileCoordinates.tileY': 1 });

// Pre-save middleware to calculate affected tiles
paintPixelSchema.pre('save', function (next) {
    if (this.strokePath && this.strokePath.length > 0) {
        const tileSize = 64; // Adjust based on your tile system
        const affectedTiles = new Set();

        this.strokePath.forEach(point => {
            const tileX = Math.floor(point.fromX / tileSize);
            const tileY = Math.floor(point.fromY / tileSize);
            const tileXTo = Math.floor(point.toX / tileSize);
            const tileYTo = Math.floor(point.toY / tileSize);

            affectedTiles.add(`${tileX},${tileY}`);
            affectedTiles.add(`${tileXTo},${tileYTo}`);
        });

        this.tileCoordinates = Array.from(affectedTiles).map(tile => {
            const [tileX, tileY] = tile.split(',').map(Number);
            return { tileX, tileY, tileSize };
        });
    }
    next();
});

// Static methods for canvas operations
paintPixelSchema.statics.getCanvasData = function (sessionId, canvasResolution) {
    return this.find({
        sessionId,
        canvasResolution
    }).sort({ createdAt: 1 });
};

paintPixelSchema.statics.clearCanvas = function (sessionId, canvasResolution) {
    return this.deleteMany({
        sessionId,
        canvasResolution
    });
};

paintPixelSchema.statics.getTileData = function (sessionId, tileX, tileY, tileSize = 64) {
    return this.find({
        sessionId,
        'tileCoordinates.tileX': tileX,
        'tileCoordinates.tileY': tileY,
        'tileCoordinates.tileSize': tileSize
    }).sort({ createdAt: 1 });
};

const PaintPixel = mongoose.model('PaintPixel', paintPixelSchema);
export { PaintPixel }