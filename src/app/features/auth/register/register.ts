import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { AuthService } from '../../../core/auth/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { LegalDialog, LegalDoc } from '../../../shared/legal/legal-dialog';
import {
  DocType,
  OrganizerType,
  UserRole,
} from '../../../core/models/user.model';

const DOC_PATTERNS: Record<DocType, RegExp> = {
  DNI: /^\d{8}$/,
  CE: /^\d{9,12}$/,
  PASAPORTE: /^[A-Za-z0-9]{6,12}$/,
};

@Component({
  selector: 'tkt-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatSelectModule,
    MatProgressBarModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private notify = inject(NotificationService);
  private dialog = inject(MatDialog);

  readonly loading = signal(false);
  readonly hide = signal(true);

  readonly countries = [
    { code: 'PE', name: 'Perú', dial: '+51' },
    { code: 'CL', name: 'Chile', dial: '+56' },
    { code: 'CO', name: 'Colombia', dial: '+57' },
    { code: 'EC', name: 'Ecuador', dial: '+593' },
    { code: 'MX', name: 'México', dial: '+52' },
    { code: 'AR', name: 'Argentina', dial: '+54' },
    { code: 'ES', name: 'España', dial: '+34' },
  ];
  readonly docTypes: DocType[] = ['DNI', 'CE', 'PASAPORTE'];
  readonly genders = [
    { value: 'F', label: 'Femenino' },
    { value: 'M', label: 'Masculino' },
  ];

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['CLIENT' as UserRole, Validators.required],

    personal: this.fb.nonNullable.group({
      country: ['PE', Validators.required],
      city: ['', Validators.required],
      district: [''],
      docType: ['DNI' as DocType, Validators.required],
      docNumber: ['', [Validators.required, Validators.pattern(DOC_PATTERNS.DNI)]],
      gender: ['', Validators.required],
      phoneCode: ['+51', Validators.required],
      phone: ['', [Validators.required, Validators.pattern(/^\d{6,12}$/)]],
    }),

    organizer: this.fb.nonNullable.group({
      orgType: ['EMPRESA' as OrganizerType, Validators.required],
      displayName: ['', [Validators.required, Validators.minLength(2)]],
      taxId: ['', [Validators.required, Validators.pattern(/^(10|15|17|20)\d{9}$/)]],
      legalName: ['', Validators.required],
      phone: [
        '',
        [Validators.required, Validators.pattern(/^\d{6,17}$/), Validators.maxLength(17)],
      ],
      country: ['PE', Validators.required],
      city: ['', Validators.required],
      website: [
        '',
        Validators.pattern(/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/\S*)?$/i),
      ],
    }),

    acceptedTerms: [false, Validators.requiredTrue],
    marketingOptIn: [false],
  });

  get personal() {
    return this.form.controls.personal;
  }
  get org() {
    return this.form.controls.organizer;
  }

  private readonly roleValue = toSignal(this.form.controls.role.valueChanges, {
    initialValue: this.form.controls.role.value,
  });
  readonly isOrganizer = computed(() => this.roleValue() === 'ORGANIZER');

  readonly firstNameLabel = computed(() =>
    this.isOrganizer() ? 'Nombre del responsable' : 'Nombre',
  );
  readonly lastNameLabel = computed(() =>
    this.isOrganizer() ? 'Apellidos del responsable' : 'Apellidos',
  );

  private readonly orgTypeValue = toSignal(
    this.org.controls.orgType.valueChanges,
    { initialValue: this.org.controls.orgType.value },
  );
  readonly taxIdLabel = computed(() =>
    this.orgTypeValue() === 'PERSONA' ? 'DNI' : 'RUC',
  );

  private readonly docTypeValue = toSignal(
    this.personal.controls.docType.valueChanges,
    { initialValue: this.personal.controls.docType.value },
  );
  readonly docPlaceholder = computed(() =>
    this.docTypeValue() === 'DNI' ? '8 dígitos' : 'N° de documento',
  );

  constructor() {
    this.applyRole(this.form.controls.role.value);

    this.form.controls.role.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((role) => this.applyRole(role));

    this.org.controls.orgType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => this.applyOrgTypeRules(type));

    this.personal.controls.docType.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((type) => {
        const ctrl = this.personal.controls.docNumber;
        ctrl.setValidators([
          Validators.required,
          Validators.pattern(DOC_PATTERNS[type]),
        ]);
        ctrl.updateValueAndValidity();
      });

    this.personal.controls.country.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((code) => {
        const c = this.countries.find((x) => x.code === code);
        if (c) this.personal.controls.phoneCode.setValue(c.dial);
      });
  }

  openLegal(doc: LegalDoc, event: Event): void {
    event.preventDefault();
    this.dialog.open(LegalDialog, {
      data: { key: doc },
      width: 'min(680px, 94vw)',
      maxWidth: '94vw',
      autoFocus: false,
      backdropClass: 'tkt-legal-backdrop',
      panelClass: 'tkt-legal-panel',
    });
  }

  /** Habilita sólo la rama del rol elegido (cliente o organizador). */
  private applyRole(role: string): void {
    if (role === 'ORGANIZER') {
      this.personal.disable({ emitEvent: false });
      this.org.enable({ emitEvent: false });
    } else {
      this.org.disable({ emitEvent: false });
      this.personal.enable({ emitEvent: false });
    }
  }

  /** Lleva la vista al primer campo inválido (suele estar fuera de pantalla). */
  private focusFirstError(): void {
    setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        'form input.ng-invalid, form textarea.ng-invalid, form mat-select.ng-invalid, form mat-checkbox.ng-invalid',
      );
      if (!el) return;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA'
        ? el
        : el.querySelector<HTMLElement>('input, button')
      )?.focus();
    });
  }

  private applyOrgTypeRules(type: OrganizerType): void {
    const taxId = this.org.controls.taxId;
    const legalName = this.org.controls.legalName;

    taxId.setValidators([
      Validators.required,
      Validators.pattern(type === 'PERSONA' ? /^\d{8}$/ : /^(10|15|17|20)\d{9}$/),
    ]);
    taxId.updateValueAndValidity();

    if (type === 'EMPRESA') {
      legalName.setValidators(Validators.required);
    } else {
      legalName.clearValidators();
      legalName.setValue('');
    }
    legalName.updateValueAndValidity();
  }

  submit(): void {
    if (this.loading()) return;

    const baseValid =
      this.form.controls.firstName.valid &&
      this.form.controls.lastName.valid &&
      this.form.controls.email.valid &&
      this.form.controls.password.valid &&
      this.form.controls.acceptedTerms.valid;
    const branchValid = this.isOrganizer()
      ? this.org.valid
      : this.personal.valid;

    if (!baseValid || !branchValid) {
      this.form.markAllAsTouched();
      this.notify.error('Revisa los campos marcados en rojo.');
      this.focusFirstError();
      return;
    }
    const raw = this.form.getRawValue();
    const fullName = `${raw.firstName.trim()} ${raw.lastName.trim()}`.trim();
    this.loading.set(true);

    this.auth
      .register({
        fullName,
        email: raw.email,
        password: raw.password,
        role: raw.role,
        acceptedTerms: raw.acceptedTerms,
        marketingOptIn: raw.marketingOptIn,
        profile:
          raw.role === 'CLIENT'
            ? {
                country: raw.personal.country,
                city: raw.personal.city.trim(),
                district: raw.personal.district.trim(),
                docType: raw.personal.docType,
                docNumber: raw.personal.docNumber.trim().toUpperCase(),
                gender: raw.personal.gender as never,
                phoneCode: raw.personal.phoneCode,
                phone: raw.personal.phone.trim(),
              }
            : undefined,
        organizer:
          raw.role === 'ORGANIZER'
            ? {
                orgType: raw.organizer.orgType,
                displayName: raw.organizer.displayName.trim(),
                taxId: raw.organizer.taxId.trim(),
                legalName: raw.organizer.legalName.trim(),
                // el responsable es la persona que abre la cuenta
                repName: fullName,
                phone: raw.organizer.phone.trim(),
                country: raw.organizer.country,
                city: raw.organizer.city.trim(),
                website: raw.organizer.website.trim(),
              }
            : undefined,
      })
      .subscribe({
        next: (res) => {
          this.notify.success(
            `Cuenta creada. ¡Bienvenido, ${res.user.fullName.split(' ')[0]}!`,
          );
          this.router.navigateByUrl(
            res.user.role === 'ORGANIZER' ? '/organizador/panel' : '/eventos',
          );
        },
        error: (err) => {
          this.loading.set(false);
          this.notify.error(err?.message ?? 'No se pudo crear la cuenta.');
        },
      });
  }
}
